// import { SimpleComponent } from './components/SimpleComponent';
import './assets/scss/style.scss';
import * as d3 from 'd3';

// d3.select("body")
//     .append("svg")
//     .attr("width", 500)
//     .attr("height", 200)
//     .append("rect")
//     .attr("width", 300)
//     .attr("height", 100);

interface IMutationItem {
    chromosome: string;
    end: number;
    id: string;
    mutation: string;
    start: number;
    study: string[];
    type: string;
}

interface IRawMutationData {
    facets: any;
    hits: IMutationItem[];
}

class MutationData {
    rawData: IMutationItem[];

    constructor(dataset: IRawMutationData | IMutationItem[]) {
        if ((<IRawMutationData>dataset).hits) {
            this.rawData = (<IRawMutationData>dataset).hits;
        } else {
            this.rawData = <IMutationItem[]>dataset;
        }
    }

    getChromosomes(): string[] {
        const result: string[] = [];
        this.rawData.forEach((item) => {
            result.push(item.chromosome);
        });
        return result;
    }

    getTypes(): string[] {
        const result: string[] = [];
        this.rawData.forEach((item) => {
            result.push(item.type);
        });
        return result;
    }

    static chromosomeLabels: string[] = [
        '1', '2', '3', '4', '5', '6', '7', '8',
        '9', '10', '11', '12', '13', '14', '15', '16',
        '17', '18', '19', '20', '21', '22', 'X', 'Y'
    ];

    static typeLabels: string[] = [
        'single base substitution',
        'deletion of <=200bp',
        'insertion of <=200bp',
        'multiple base substitution (>=2bp and <=200bp)'
    ];

    getChromosomeCounts(): number[] {
        return count(MutationData.chromosomeLabels, this.getChromosomes());
    }

    getTypeCounts(): number[] {
        return count(MutationData.typeLabels, this.getTypes());
    }

    filter(chromLabel: string, typeLabel: string): MutationData {
        let filtered: MutationData;
        if (chromLabel === '' && typeLabel !== '') { // filter by type only
            filtered = new MutationData(this.rawData.filter(function (item) {
                return (item.type === typeLabel);
            }));
        } else if (chromLabel !== '' && typeLabel === '') { // filter by chromosome only
            filtered = new MutationData(this.rawData.filter(function (item) {
                return (item.chromosome === chromLabel);
            }));
        } else if (chromLabel !== '' && typeLabel !== '') { //filter by both
            filtered = new MutationData(this.rawData.filter(function (item) {
                return (item.chromosome === chromLabel && item.type === typeLabel);
            }));
        } else {
            filtered = new MutationData(this.rawData);
        }

        return filtered;
    }
}

function count(labels: string[], list: string[]): number[] {
    const result: number[] = [];

    labels.forEach((label) => {
        let count: number = 0;
        list.forEach((item) => {
            if (item === label) {
                count++;
            }
        });
        result.push(count);
    });

    return result;
}

d3.json('https://dcc.icgc.org/api/v1/projects/GBM-US/mutations?field=id,mutation,type,chromosome,start,end&size=100&order=desc')
    .then((rawdata: {}) => {
        const data = new MutationData(<IRawMutationData>rawdata);

        const margin = { top: 20, right: 10, bottom: 20, left: 10 };
        const width: number = 960 - margin.left - margin.right;
        const height: number = 600 - margin.top - margin.bottom;

        let chromosomeSelection: string = '';
        let typeSelection: string = '';

        const svg = d3.select('body')
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top} )`);

        // scales for top diagram

        const xScaleTop = d3.scaleBand()
            .domain(MutationData.chromosomeLabels)
            .rangeRound([0, width])
            .paddingInner(0.3);

        const yScaleTop = d3.scaleLinear()
            .domain([0, <number>(d3.max(data.getChromosomeCounts()))])
            .range([height * 3 / 4, 0]);

        // scales for bottom diagram

        const xScaleBottom = d3.scaleLinear()
            .domain([0, <number>(d3.max(data.getTypeCounts()))])
            .range([width * 1 / 4, width * 9 / 10]);


        const yScaleBottom = d3.scaleBand()
            .domain(MutationData.typeLabels)
            .rangeRound([height * 3 / 4 + 60, height])
            .paddingInner(0.3);

        // function for drawing/updating chromosome bars

        let chromosomesFirstDrawn: boolean = true;

        const drawChromosomeBars = function (mData: MutationData): void {
            let transitionDuration: number;

            if (chromosomesFirstDrawn) {
                transitionDuration = 0;
            } else {
                transitionDuration = 500;
            }

            const bars = svg.selectAll('.chromBars')
                .data(mData.getChromosomeCounts());

            console.log(bars.size());

            bars
                .enter()
                .append('rect')
                .classed('chromBars', true)
                .merge(<d3.Selection<SVGRectElement, number, SVGGElement, {}>><unknown>bars)
                .transition()
                .duration(transitionDuration)
                .attr('x', function (_d, i) {
                    return <number>xScaleTop(MutationData.chromosomeLabels[i]);
                })
                .attr('y', function (d) {
                    return yScaleTop(d);
                })
                .attr('width', xScaleTop.bandwidth())
                .attr('height', function (d) {
                    return yScaleTop(0) - yScaleTop(d);
                });
        };

        // function for drawing/updating chromosome count labels

        const drawChromosomeCounts = function (mData: MutationData): void {
            let transitionDuration: number;

            if (chromosomesFirstDrawn) {
                transitionDuration = 0;
            } else {
                transitionDuration = 500;
            }

            const labels = svg.selectAll('.chromCounts')
                .data(mData.getChromosomeCounts());

            labels.enter()
                .append('text')
                .classed('chromCounts', true)
                .merge(<d3.Selection<SVGTextElement, number, SVGGElement, {}>><unknown>labels)
                .transition()
                .duration(transitionDuration)
                .text((d) => { return d; })
                .attr('x', function (_d, i) {
                    return <number>xScaleTop(MutationData.chromosomeLabels[i]) + xScaleTop.bandwidth() / 2;
                })
                .attr('y', function (d) {
                    let yPos: number;
                    if (yScaleTop(0) - yScaleTop(d) < 20) {
                        yPos = yScaleTop(d) - 6;
                    } else {
                        yPos = yScaleTop(d) + 16;
                    }
                    return yPos;
                })
                .attr('fill', function (d) {
                    let fill: string;
                    if (yScaleTop(0) - yScaleTop(d) < 20) {
                        fill = 'grey';
                    } else {
                        fill = 'white';
                    }
                    return fill;
                })
                .attr('font-size', '10px')
                .attr('text-anchor', 'middle');
        };

        // function for drawing/updating type bars

        let typesFirstDrawn: boolean = true;

        const drawTypeBars = function (mData: MutationData): void {
            let transitionDuration: number;

            if (typesFirstDrawn) {
                transitionDuration = 0;
            } else {
                transitionDuration = 500;
            }

            const bars = svg.selectAll('.typeBars')
                .data(mData.getTypeCounts());

            console.log(bars.size());

            bars
                .enter()
                .append('rect')
                .classed('typeBars', true)
                .merge(<d3.Selection<SVGRectElement, number, SVGGElement, {}>><unknown>bars)
                .transition()
                .duration(transitionDuration)
                .attr('x', xScaleBottom(0))
                .attr('y', function (_d, i) {
                    return <number>yScaleBottom(MutationData.typeLabels[i]);
                })
                .attr('width', function (d) {
                    return xScaleBottom(d) - xScaleBottom(0);
                })
                .attr('height', yScaleBottom.bandwidth());
        };

        // function for drawing/updating type count labels

        const drawTypeCounts = function (mData: MutationData): void {
            let transitionDuration: number;

            if (typesFirstDrawn) {
                transitionDuration = 0;
            } else {
                transitionDuration = 500;
            }

            const labels = svg.selectAll('.typeCounts')
                .data(mData.getTypeCounts());

            labels
                .enter()
                .append('text')
                .classed('typeCounts', true)
                .merge(<d3.Selection<SVGTextElement, number, SVGGElement, {}>><unknown>labels)
                .transition()
                .duration(transitionDuration)
                .text((d) => { return d; })
                .attr('x', function (d) {
                    // let xPos: number;
                    // if (xScaleBottom(d) - xScaleBottom(0) < 20) {
                    //     xPos = xScaleBottom(d) + 12;
                    // } else {
                    //     xPos = xScaleBottom(d) - 12;
                    // }
                    // return xPos;
                    return xScaleBottom(d) + 12;
                })
                .attr('y', function (_d, i) {
                    return <number>yScaleBottom(MutationData.typeLabels[i]) + yScaleBottom.bandwidth() / 2 + 3;
                })
                .attr('fill', function () {
                    // let fill: string;
                    // if (xScaleBottom(d) - xScaleBottom(0) < 20) {
                    //     fill = 'grey';
                    // } else {
                    //     fill = 'white';
                    // }
                    // return fill;
                    return 'grey';
                })
                .attr('font-size', '10px')
                .attr('text-anchor', 'start');
        };

        // create chromosome labels

        svg.selectAll('.chromLabels')
            .data(data.getChromosomeCounts())
            .enter()
            .append('text')
            .text(function (_d, i) {
                return MutationData.chromosomeLabels[i];
            })
            .attr('x', function (_d, i) {
                return <number>xScaleTop(MutationData.chromosomeLabels[i]) + xScaleTop.bandwidth() / 2;
            })
            .attr('y', yScaleTop(0) + 26)
            .attr('text-anchor', 'middle')
            .on('click', function (_d, i) {
                // filter selection

                chromosomeSelection = MutationData.chromosomeLabels[i];

                const filtered = data.filter(chromosomeSelection, typeSelection);

                // update bars and count labels

                drawChromosomeBars(filtered);
                drawChromosomeCounts(filtered);
                drawTypeBars(filtered);
                drawTypeCounts(filtered);

                // color all labels black, then color current selection red

                svg.selectAll('.chromLabels')
                    .attr('fill', 'black');
                d3.select(this).attr('fill', 'red');
            })
            .classed('chromLabels', true);

        // create bars and count labels for chromosomes

        drawChromosomeBars(data);
        drawChromosomeCounts(data);
        chromosomesFirstDrawn = false;

        // create type labels

        svg.selectAll('.typeLabels')
            .data(data.getTypeCounts())
            .enter()
            .append('text')
            .text(function (_d, i) { // shorten label for 'mutliple ...' type
                return MutationData.typeLabels[i].replace('(>=2bp and <=200bp)', '');
            })
            .attr('text-anchor', 'end')
            .attr('x', xScaleBottom(0) - 20)
            .attr('y', function (_d, i) {
                return <number>yScaleBottom(MutationData.typeLabels[i]) + yScaleBottom.bandwidth() / 2 + 3;
            })
            .on('click', function (_d, i) {
                // filter selection

                typeSelection = MutationData.typeLabels[i];

                const filtered = data.filter(chromosomeSelection, typeSelection);

                // update bars and count labels

                drawChromosomeBars(filtered);
                drawChromosomeCounts(filtered);
                drawTypeBars(filtered);
                drawTypeCounts(filtered);

                // color all labels black, then color current selection red

                svg.selectAll('.typeLabels')
                    .attr('fill', 'black');
                d3.select(this).attr('fill', 'red');
            })
            .classed('typeLabels', true);

        // create bars and count labels for types

        drawTypeBars(data);
        drawTypeCounts(data);
        typesFirstDrawn = false;

        // TODO: add clear buttons

    })
    .catch(function () {
        console.log('Error: could not load data!');
    });
