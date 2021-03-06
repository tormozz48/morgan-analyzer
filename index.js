#!/usr/bin/env node

const hl = require('highland');
const R = require('ramda');

const PERCENTILES = [0.35, 0.50, 0.80, 0.95, 0.99];

/* eslint-disable no-control-regex */
const ANSI_REGEXP = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
const MORGAN_REGEXP = /(GET)|(POST)|(OPTIONS)|(PUT)|(PATCH)|(DELETE)/;
/* eslint-enable no-control-regex */

const toRequestRecord = (rowChunks) => {
    const [, , method, url, status, time, measure] = rowChunks;
    return {
        method,
        url,
        status: Number(status),
        time: Number(time),
        measure
    };
};

const calculatePercentiles = (res) => {
    const total = res.length;
    return PERCENTILES.reduce((acc, percentile) => {
        acc[percentile] = res[Math.floor(percentile * total)];
        return acc;
    }, {});
};

const displayPercentiles = R.compose(
    R.join('\n'),
    R.map(([key, val]) => `${100 * Number(key)}-th: ${val} ms`),
    R.toPairs
);

const stream = hl(process.stdin)
    .split() // split by rows
    .filter(R.test(MORGAN_REGEXP)) // leave only morgan request rows
    .map(R.compose(
        toRequestRecord,
        R.filter(Boolean), // remove empty chunks
        R.split(' '), // split row by whitespace characters
        R.replace(ANSI_REGEXP, '') // remove ANSI characters
    ));

stream
    .fork()
    .sortBy(R.ascend(R.prop('time'))) // (a, b) => a.time - b.time
    .pluck('time')
    .toArray(R.compose(
        console.info,
        displayPercentiles,
        calculatePercentiles
    ));

stream
    .fork()
    .sortBy(R.descend(R.prop('time'))) // (a, b) => b.time - a.time
    .take(10)
    .map(({time, measure, method, url}) => `Time: ${time} ${measure} Url: ${method} ${url}\n`)
    .pipe(process.stdout);
