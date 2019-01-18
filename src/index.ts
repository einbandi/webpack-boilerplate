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

interface IItem {
    chromosome: string;
    end: number;
    id: string;
    mutation: string;
    start: number;
    study: string[];
    type: string;
}

interface IDataset {
    facets: any;
    hits: IItem[];
}

class Chromosomes {
    list: string[];

    static labels: string[] = [
        '1', '2', '3', '4', '5', '6', '7', '8',
        '9', '10', '11', '12', '13', '14', '15', '16',
        '17', '18', '19', '20', '21', '22', 'X', 'Y'
    ];

    constructor(dataset: IDataset) {
        let result: string[] = [];
        dataset.hits.forEach((item) => {
            result.push(item.chromosome);
        });
        this.list = result;
    }

    getCounts(): number[] {
        let result: number[] = [];
        Chromosomes.labels.forEach((label) => {
            let count: number = 0;
            this.list.forEach((item) => {
                if (item === label) {
                    count++;
                }
            });
            result.push(count);
        });
        return result;
    }
}

class Types {
    list: string[];

    static labels: string[] = [
        'single base substitution',
        'deletion of <=200bp',
        'insertion of <=200bp',
        'multiple base substitution (>=2bp and <=200bp)'
    ];

    constructor(dataset: IDataset) {
        let result: string[] = [];
        dataset.hits.forEach((item) => {
            result.push(item.type);
        });
        this.list = result;
    }

    getCounts(): number[] {
        let result: number[] = [];
        Types.labels.forEach((label) => {
            let count: number = 0;
            this.list.forEach((item) => {
                if (item === label) {
                    count++;
                }
            });
            result.push(count);
        });
        return result;
    }
}

d3.json('https://dcc.icgc.org/api/v1/projects/GBM-US/mutations?field=id,mutation,type,chromosome,start,end&size=100&order=desc')
    .then((rawdata: {}) => {
        let chromosomes = new Chromosomes(<IDataset>rawdata);
        let types = new Types(<IDataset>rawdata);

        console.log(chromosomes.getCounts());
        console.log(types.getCounts());

        const svgWidth: number = 900;
        const svgHeight: number = 400;

        let svg = d3.select('body')
            .append('svg')
            .attr('width', svgWidth)
            .attr('height', svgHeight);

        svg.selectAll('text')
            .data(chromosomes.getCounts())
            .enter()
            .append('text')
            .text((d) => { return d; })
            .attr('x', (_d, i) => {
                return i * 30;
                //TODO: implement scale bands for x axis
            })
            .attr('y', svgHeight / 2);

    })
    .catch(function () {
        console.log('Error: could not load data!');
    });
