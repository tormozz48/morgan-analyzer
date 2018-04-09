const _ = require('lodash');
const hl = require('highland');

const HTTP_METHODS = ['GET', 'POST', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE'];
const PERCENTILES = [0.35, 0.50, 0.80, 0.95, 0.99];

const isMorganRequestRecord = (row) => HTTP_METHODS.some((method) => row.indexOf(method) > -1);

const splitRowBySpaces = (row) => _.split(row, ' ');

const timeComparator = (a, b) => a.time - b.time;

const toRequestRecord = (rowChunks) => {
    const [,,method, url, status, time, measure, ...other] = rowChunks;
    return {
        method,
        url,
        status: Number(status),
        time: Number(time),
        measure
    };
}

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
}

const stream = hl(process.stdin)
    .split()
    .filter(isMorganRequestRecord)
    .map(splitRowBySpaces)
    .map(_.compact)
    .map(toRequestRecord)

stream
    .sortBy(timeComparator)
    .map((v) => v.time)
    .toArray(function(res) {
        console.info(displayPercentiles(calculatePercentiles(res)));
    });