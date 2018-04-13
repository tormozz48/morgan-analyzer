const _ = require('lodash');
const hl = require('highland');

const ANSI_REGEXP = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
const HTTP_METHODS = ['GET', 'POST', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE'];
const PERCENTILES = [0.35, 0.50, 0.80, 0.95, 0.99];

const isMorganRequestRecord = (row) => HTTP_METHODS.some((method) => row.indexOf(method) > -1);

const removeANSI = (str) => str.replace(ANSI_REGEXP, '');

const splitRowBySpaces = (row) => _.split(row, ' ');

const timeComparator = (a, b) => a.time - b.time;

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

const displayPercentiles = (percentiles) => {
    return _(percentiles)
        .toPairs()
        .map((item) => `${100 * Number(item[0])}-th: ${item[1]} ms`)
        .join('\n');
};

const displayRequestRecord = (record) =>{
    return `Time: ${record.time} ${record.measure} Url: ${record.method} ${record.url}\n`;
};

const stream = hl(process.stdin)
    .split()
    .filter(isMorganRequestRecord)
    .map(hl.compose(toRequestRecord, _.compact, splitRowBySpaces, removeANSI));

stream
    .fork()
    .sortBy(timeComparator)
    .pluck('time')
    .toArray(hl.compose(console.info, displayPercentiles, calculatePercentiles));

stream
    .fork()
    .sortBy(_.flip(timeComparator))
    .take(10)
    .map(displayRequestRecord)
    .pipe(process.stdout);
