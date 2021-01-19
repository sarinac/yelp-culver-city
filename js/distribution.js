import Helpers from "./helpers.js"

class Distribution {

    constructor(filepath) {

        d3.csv(filepath)
            .then((data)=> {
                this.data = this.validate(data);
                this.draw();
            })
            .catch((error) => console.error("Error loading data"));
    }

    validate(data) {
        let checks = {}; // Use dictionary for cleaner lookup
        let categories = []; // Append unique categories to this list
        for(var i = 0; i < data.length; i++) { 
            data[i].rating = +data[i].rating; // numeric
            data[i].name = "" + data[i].name; // string
            data[i].id = "" + data[i].id; // string
            data[i].category_1 = "" + data[i].category_1; // string
            data[i].category_2 = "" + data[i].category_2; // string
            data[i].category_3 = "" + data[i].category_3; // string

            if (!(data[i].category_1 in checks)) {
                checks[data[i].category_1] = 1;
                categories.push(data[i].category_1);
            }
            if (!(data[i].category_2 in checks)) {
                checks[data[i].category_2] = 1;
                categories.push(data[i].category_2);
            }
            if (!(data[i].category_3 in checks)) {
                checks[data[i].category_3] = 1;
                categories.push(data[i].category_3);
            }
        }

        // Add autocomplete feature in Search input form
        Helpers.autocomplete(document.getElementById("categoryInput"), categories);
        
        return data;
    }

    draw() {
        // Define dimensions
        this.width = 400;
        this.height = 400;
        this.rightMargin = 50;
        this.padding = 2.5;
        this.rectRadius = 5;
        this.rectPadding = 10;

        // Set up SVG and plot (<g> element)
        const svg = d3.select("#chart-ratings")
            .append("svg")
                .attr("width", this.width)
                .attr("height", this.height); 
        this.hist = svg.append("g");
        this.histLabel = svg.append("g");
        this.text = svg.append("g");

        // Draw
        this.createScales();
        this.addText();
        this.drawBars();

    }

    createScales() {
        // Color for Ratings 1-5
        this.ratingInput = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];
        const ratingOutput = ["#fdf5cc", "#fdf5cc", "#fdedce", 
                            "#fdedce", "#fde6cf", "#fde6cf", 
                            "#fdded1", "#fdded1", "#fcd8d3"];
        this.colorScale = d3.scaleOrdinal()
            .domain(this.ratingInput)
            .range(ratingOutput);

        // Ratings yScale    
        this.yScale = d3.scaleLinear()
            .domain([0.75, 5.25]) // Ratings 1-5
            .range([this.height, 0]);
    }

    addText() {
        this.text
            .attr("class","ratings")
            .selectAll("text")
            .data(this.ratingInput)
            .enter()
            .append("text")
                .attr("y", d => this.yScale(d))
                .attr("x", 20)
                .text(d => d.toFixed(1) + " star" + (d > 1? "s":""));
    }

    drawBars() {
        this.aggregateData();

        // Rectangles for yAxis
        this.bars = this.hist
            .classed("ratings", true)
            .selectAll("rect")
            .data(this.aggregate, d => d.key)
            .enter()
            .append("rect")
                .attr("x", 0)
                .attr("y", d => this.yScale(+d.key + .25) + this.padding)
                .attr("width", d => this.xScale(d.value))
                .attr("height", this.height / this.ratingInput.length - 2 * this.padding)
                .attr("fill", d => this.colorScale(+d.key))
                .attr("rx", this.rectRadius)
                .attr("ry", this.rectRadius);

        // Annotate
        this.annotate = this.histLabel
            .append("g")
                .classed("ratings", true)
                .selectAll("text")
                .data(this.aggregate, d => d.key)
                .enter()
                .append("text")
                    .text(d => d.value)
                    .attr("x", d => this.xScale(d.value) + this.rectPadding)
                    .attr("y", d => this.yScale(d.key));

    }

    aggregateData(searchText = "") {

        let filteredData = (
            searchText === "" ? 
            this.data : 
            this.data.filter(d => (
                d.category_1 === searchText || 
                d.category_3 === searchText || 
                d.category_3 === searchText 
            ))
        );

        let spine = {};
        for(var i = 1.0; i <= 5.0; i = i+0.5) {
            spine[i] = [];
        };

        // grouped (Object) = {1.0: [], 1.5: []...}
        let grouped = filteredData.reduce((p, c) => {
            // p[c["key"]] = (p[c["key"]]||[])
            p[c["rating"]].push(c["rating"]);
            return p;
        }, spine);

        // aggregate (Array) = [{key: 1.0, value: 4}, {key: 1.5, value: 4}]
        this.aggregate = Object.keys(grouped).map(key => {
            return {
                key: key, 
                // value: grouped[key].reduce((p, c) => p + c, 0) / grouped[key].length // get average
                value: grouped[key].length, // get count
            }
        });

        // Convert data types
        this.aggregate.forEach(d => {
            d.key = +d.key; //numeric
        })

        // Counts xScale
        this.xScale = d3.scaleLinear()
            .domain([0, d3.max(this.aggregate, d=>d.value)])
            .range([120, this.width - this.rightMargin]);
        
        this.updateKPIs(searchText);
    }

    updateKPIs(searchText) {
        // Calculate KPIs
        let total = d3.sum(this.aggregate, d => d.value);
        let average = d3.sum(this.aggregate, d => d.key * d.value) / total;
        let rating = Math.round(average * 10 / 5) * 5 / 10;

        // Update KPIs
        document.getElementById("chart-ratings-category").innerHTML = `<h1>${(searchText === "" ? "All Businesses" : searchText)}</h1>`;
        document.getElementById("chart-ratings-ratings-pic").innerHTML = `<img src="img/extra_large_${Math.floor(rating)}${rating % 1 === .5 ? "_half" : ""}.png">`;
        document.getElementById("chart-ratings-ratings").innerHTML = `<h2>${average.toFixed(1)} rating</h2>`;
        document.getElementById("chart-ratings-reviews").innerHTML = `<h2>${total} reviews</h2>`;
    }

    update() {
        // Get inputted text
        let searchText =  document.getElementById("categoryInput").value;

        // Calculate data
        this.aggregateData(searchText);

        // Reset bar count
        this.bars // Update bar width with filtered dataset
            .data(this.aggregate, d => d.key)
            .merge(this.bars)
            .transition()
            .duration(500)
                .attr("width", d => this.xScale(d.value))
                .attr("y", d => this.yScale(d.key + .25) + this.padding)
                .attr("fill", d => this.colorScale(d.key));

        // Reset labels
        this.annotate // Update labels
            .data(this.aggregate, d => d.key)
            .merge(this.annotate)
            .transition()
            .duration(500)
                .text(d => d.value)
                .attr("x", d => this.xScale(d.value) + this.rectPadding)
                .attr("y", d => this.yScale(d.key));

    }
}

export default Distribution;