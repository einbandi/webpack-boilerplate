// import { SimpleComponent } from './components/SimpleComponent';
import './assets/scss/style.scss';
// import { json } from 'd3-fetch';
// import { select, Selection } from 'd3-selection';
// import { scaleLinear, scaleBand } from 'd3-scale';
// import { max } from 'd3-array';

import * as d3 from 'd3';

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

        // switch for setting transition after first plotting

        let firstDrawn: boolean = true;

        // function for drawing/updating chromosome bars

        const drawChromosomeBars = function (mData: MutationData): void {
            let transitionDuration: number;

            if (firstDrawn) {
                transitionDuration = 0;
            } else {
                transitionDuration = 500;
            }

            const bars = svg.selectAll('.chromBars')
                .data(mData.getChromosomeCounts());

            bars.enter()
                .append('rect')
                .classed('chromBars', true)
                .merge(<d3.Selection<SVGRectElement, number, SVGGElement, {}>><unknown>bars)
                .transition()
                .duration(transitionDuration)
                .attr('x', (_d, i) =>
                    <number>xScaleTop(MutationData.chromosomeLabels[i]))
                .attr('y', (d) => yScaleTop(d))
                .attr('width', xScaleTop.bandwidth())
                .attr('height', (d) => yScaleTop(0) - yScaleTop(d))
                ;
        };

        // function for drawing/updating chromosome count labels

        const drawChromosomeCounts = function (mData: MutationData): void {
            let transitionDuration: number;

            if (firstDrawn) {
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
                .text((d) => d)
                .attr('x', (_d, i) =>
                    <number>xScaleTop(MutationData.chromosomeLabels[i]) + xScaleTop.bandwidth() / 2)
                .attr('font-size', '10px')
                .attr('text-anchor', 'middle')
                .attr('y', (d) => yScaleTop(d) + 16)
                .attr('fill', 'white')
                .filter((d) => yScaleTop(0) - yScaleTop(d) < 20)
                .attr('y', (d) => yScaleTop(d) - 6)
                .attr('fill', 'grey')
                ;
        };

        // function for drawing/updating type bars

        const drawTypeBars = function (mData: MutationData): void {
            let transitionDuration: number;

            if (firstDrawn) {
                transitionDuration = 0;
            } else {
                transitionDuration = 500;
            }

            const bars = svg.selectAll('.typeBars')
                .data(mData.getTypeCounts());

            bars.enter()
                .append('rect')
                .classed('typeBars', true)
                .merge(<d3.Selection<SVGRectElement, number, SVGGElement, {}>><unknown>bars)
                .transition()
                .duration(transitionDuration)
                .attr('x', xScaleBottom(0))
                .attr('y', (_d, i) =>
                    <number>yScaleBottom(MutationData.typeLabels[i]))
                .attr('width', (d) =>
                    xScaleBottom(d) - xScaleBottom(0))
                .attr('height', yScaleBottom.bandwidth())
                ;
        };

        // function for drawing/updating type count labels

        const drawTypeCounts = function (mData: MutationData): void {
            let transitionDuration: number;

            if (firstDrawn) {
                transitionDuration = 0;
            } else {
                transitionDuration = 500;
            }

            const labels = svg.selectAll('.typeCounts')
                .data(mData.getTypeCounts());

            labels.enter()
                .append('text')
                .classed('typeCounts', true)
                .merge(<d3.Selection<SVGTextElement, number, SVGGElement, {}>><unknown>labels)
                .transition()
                .duration(transitionDuration)
                .text((d) => { return d; })
                .attr('font-size', '10px')
                .attr('y', (_d, i) =>
                    <number>yScaleBottom(MutationData.typeLabels[i]) + yScaleBottom.bandwidth() / 2 + 3)
                .attr('text-anchor', 'start')
                .attr('x', (d) => xScaleBottom(d) + 12)
                .attr('fill', 'grey')
                // .filter((d) => xScaleBottom(d) - xScaleBottom(0) >= 20)
                // .attr('text-anchor', 'end')
                // .attr('x', (d) => xScaleBottom(d) - 12)
                // .attr('fill', 'white')
                ;
        };

        const updateView = function (mData: MutationData): void {
            drawChromosomeBars(mData);
            drawChromosomeCounts(mData);
            drawTypeBars(mData);
            drawTypeCounts(mData);

            firstDrawn = false;
        };

        // create chromosome labels

        svg.selectAll('.chromLabels')
            .data(data.getChromosomeCounts())
            .enter()
            .append('text')
            .text((_d, i) => MutationData.chromosomeLabels[i])
            .attr('x', (_d, i) =>
                <number>xScaleTop(MutationData.chromosomeLabels[i]) + xScaleTop.bandwidth() / 2)
            .attr('y', yScaleTop(0) + 26)
            .attr('text-anchor', 'middle')
            .on('click', function (_d, i) {
                // filter selection

                chromosomeSelection = MutationData.chromosomeLabels[i];

                const filtered = data.filter(chromosomeSelection, typeSelection);

                // update bars and count labels

                updateView(filtered);

                // color all labels black, then color current selection red

                svg.selectAll('.chromLabels')
                    .attr('fill', 'black');
                d3.select(this).attr('fill', 'red');
            })
            .classed('chromLabels', true)
            ;

        // create type labels

        svg.selectAll('.typeLabels')
            .data(data.getTypeCounts())
            .enter()
            .append('text')
            .text((_d, i) =>
                MutationData.typeLabels[i].replace('(>=2bp and <=200bp)', ''))
            .attr('text-anchor', 'end')
            .attr('x', xScaleBottom(0) - 20)
            .attr('y', (_d, i) =>
                <number>yScaleBottom(MutationData.typeLabels[i]) + yScaleBottom.bandwidth() / 2 + 3)
            .on('click', function (_d, i) {
                // filter selection

                typeSelection = MutationData.typeLabels[i];

                const filtered = data.filter(chromosomeSelection, typeSelection);

                // update bars and count labels

                updateView(filtered);

                // color all labels black, then color current selection red

                svg.selectAll('.typeLabels')
                    .attr('fill', 'black');
                d3.select(this).attr('fill', 'red');
            })
            .classed('typeLabels', true)
            ;

        // create all bars and count labels

        updateView(data);

        // create 'clear' buttons

        const buttonDiv = d3.select('body')
            .append('div');

        buttonDiv.append('button')
            .style('margin-right', '10px')
            .html('Clear chromosome selection')
            .on('click', function () {
                chromosomeSelection = '';

                const filtered = data.filter(chromosomeSelection, typeSelection);

                updateView(filtered);

                svg.selectAll('.chromLabels')
                    .attr('fill', 'black');
            });

        buttonDiv.append('button')
            .style('margin-right', '10px')
            .html('Clear type selection')
            .on('click', function () {
                typeSelection = '';

                const filtered = data.filter(chromosomeSelection, typeSelection);

                updateView(filtered);

                svg.selectAll('.typeLabels')
                    .attr('fill', 'black');
            });

        buttonDiv.append('button')
            .style('margin-right', '10px')
            .html('Clear all')
            .on('click', function () {
                chromosomeSelection = '';
                typeSelection = '';

                const filtered = data.filter(chromosomeSelection, typeSelection);

                updateView(filtered);

                svg.selectAll('.chromLabels, .typeLabels')
                    .attr('fill', 'black');
            });

    })
    .catch(function () {
        console.log('Error: could not load data!');
    });
