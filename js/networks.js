class Network {

    constructor(filepath) {
        d3.json(filepath)
            .then((data)=> {
                this.data = this.validate(data);
                this.draw();
            })
            .catch((error) => console.error("Error loading data"));
    }

    validate(data) {

        const recategorize = (category) => {

            let superCategories = {
                "Restaurants": ["Restaurants"],
                "Food": ["Food"],
                "Public + Recreation": ["Active Life", "Education", "Local Flavor", "Public Services & Government"],
                "Shopping + Entertainment": ["Beauty & Spas", "Nightlife", "Shopping", "Arts & Entertainment"]
            }
    
            for (var superList in superCategories) {
                if (superCategories[superList].indexOf(category) >= 0) {
                    return superList
                }
            }
        };

        // Convert NODES data types
        for(var i = 0; i < data.nodes.length; i++) { 
            data.nodes[i].category = "" + data.nodes[i].category; // string
            data.nodes[i].super_category = recategorize(data.nodes[i].super_category); // string
            data.nodes[i].count = +data.nodes[i].count; // numeric
            data.nodes[i].level = +data.nodes[i].level; // numeric
        };

        // Convert LINKS data types
        for(var i = 0; i < data.links.length; i++) { 
                data.links[i].source = "" + data.links[i].source; // string
                data.links[i].target = "" + data.links[i].target; // string
                data.links[i].count = +data.links[i].count; // numeric
        };

        // Sort data so that larger nodes are at the back
        data.nodes = data.nodes.sort(function(a,b){ return b.count - a.count; });

        return data;
    }

    draw() {
        
        // Define dimensions
        this.width = 1200;
        this.height = 760;
        this.maxRadius = 60;
        this.radiusPadding = 10;

        // Set up SVG and plot (<g> element)
        const svgNetworkLegend = d3.select("#chart-businesses")
            .append("svg")
                .attr("width", this.width)
                .attr("height", 30);
        const svgNetwork = d3.select("#chart-businesses")
            .append("svg")
                .attr("width", this.width)
                .attr("height", this.height);   
        this.legend = svgNetworkLegend.append("g").attr("id", "business-legend");
        this.network = svgNetwork.append("g").attr("id", "business-network");

        // Draw content
        this.createColorScale();
        this.drawLegend();
        this.drawNetwork();
        
    }

    createColorScale() {
        // Colors for the 4 Main Categories
        this.categories = ["Food", "Public + Recreation", "Shopping + Entertainment", "Restaurants"];
        const categoriesToColors = ["#fdcc55", "#fbaf8f", "#f25c01", "#d42422"];
        this.colorScale = d3.scaleOrdinal()
            .domain(this.categories)
            .range(categoriesToColors);
    }

    drawLegend() {
        let paddingPercent = .25;

        let xScale = d3.scaleLinear()
            .domain([0, this.categories.length])
            .range([this.width * paddingPercent, this.width * (1 - paddingPercent)]);

        // Add color
        this.legend
            .append("g")
                .selectAll("rect")
                .data(this.categories)
                .enter()
                .append("rect")
                    .classed("legend-rect", true)
                    .attr("fill", d => this.colorScale(d))
                    .attr("y", 0)
                    .attr("x", (d, i) => xScale(i)) 
                    .attr("width", (this.width * (1 - 2 * paddingPercent)) / this.categories.length); 

        // Add text
        this.legend
            .append("g")
                .selectAll("text")
                .data(this.categories)
                .enter()
                .append("text")
                    .classed("legend-text", true)
                    .text(d => d)
                    .attr("x", (d, i) => xScale(i + .5))
                    .attr("y", 18);
    }

    drawNetwork() {
        
        // Create radius scale
        this.rScale = d3.scaleSqrt()
            .domain([0, d3.max(this.data.nodes, d => d.count)])
            .range([0, this.maxRadius]);

        // Create objects
        this.createSimulation();
        this.createLinks();
        this.createNodes();
        this.updateSimulation();
        
    }

    createSimulation() {
        this.simulation = d3.forceSimulation(this.data.nodes)
            .force("center", d3.forceCenter().x(this.width/2).y(this.height/2))
            .force("x", d3.forceX(this.width/2).strength(.5))
            .force("y", d3.forceY(this.height/2).strength(1))
            .force("collision", d3.forceCollide().radius(d => this.rScale(d.count) + this.radiusPadding))
            .force("link", d3.forceLink().links(this.data.links).id(d => d.category));
    }

    createLinks() {
        this.links = this.network
            .append("g")
                .attr("class", "link")
                .selectAll("line")
                .data(this.data.links)
                .enter()
                .append("line")
                    .attr("stroke-width", d => d.count);
    }

    createNodes() {

        const dragEvents = {
            dragstarted: (event, d) => {
                // if (!event.active) this.simulation.alphaTarget(.03);
                d.fx = d.x;
                d.fy = d.y;
            },
        
            dragged: (event, d) => {
                d.fx = event.x;
                d.fy = event.y;
            },
        
            dragended: (event, d) => {
                d.fx = null;
                d.fy = null;
            },
        };

        const hoverEvents = {
            mouseOver: (d, selector) => {
                // Get this bar's x/y values, then augment for the tooltip
                let xPosition = parseFloat(d3.select(selector).attr("cx"));
                let yPosition = parseFloat(d3.select(selector).attr("cy"));
                let xSuperPosition = document.getElementById("chart-businesses").getBoundingClientRect().x;
                let ySuperPosition = document.getElementById("chart-businesses").getBoundingClientRect().y;

                // Show the tooltip at updated position and value
                let tooltip = d3.select("#tooltip")
                    .style("left", xSuperPosition + xPosition + "px")
                    .style("top", ySuperPosition + yPosition + window.scrollY + "px")
                    .classed("hidden", false);
                tooltip.select("#name").text(d.category);
                tooltip.select("#value").text(d.count);

                // Add stroke to nodes
                d3.select(selector).style("stroke-width", 5);
                    
                // Change link color
                let textValue = d3.select(selector).data()[0]["category"];
                this.links
                    .style("stroke", d => d.source.category == textValue || d.target.category == textValue ? this.colorScale(d.super_category) : "#5f5f5f")
                    .style("stroke-opacity", d => d.source.category == textValue || d.target.category == textValue ? 1 : .5);
            },

            mouseOut: () => {
                //Hide the tooltip
                d3.select("#tooltip")
                    .classed("hidden", true);

                // Remove stroke
                this.nodes
                    .style("stroke-width", .5);

                // Recolor links
                this.links
                    .style("stroke", "#5f5f5f")
                    .style("stroke-opacity", .5)
            },
        }

        this.nodes = this.network
            .append("g")
                .classed("node", true)
                .selectAll("circle")
                .data(this.data.nodes)
                .enter()
                .append("circle")
                    .attr("r", d => this.rScale(d.count))
                    .attr("fill", d => this.colorScale(d.super_category))
                    .call(d3.drag()
                        .on("start", dragEvents.dragstarted)
                        .on("drag", dragEvents.dragged)
                        .on("end", dragEvents.dragended))
                    .on("mouseover", function(event, d){hoverEvents.mouseOut(d, this)})
                    .on("mouseout", () => hoverEvents.mouseOut());

        this.nodeText = this.network
            .append("g")
                .classed("node", true)
                .selectAll("text")
                .data(this.data.nodes)
                .enter()
                .append("text")
                    .filter(d => (d.count > 10) && (d.category.length+7 < d.count))
                    .text(d => d.category)
                    .call(d3.drag()
                        .on("start", dragEvents.dragstarted)
                        .on("drag", dragEvents.dragged)
                        .on("end", dragEvents.dragended))
                    .on("mouseover", function(d){hoverEvents.mouseOut(d, this)})
                    .on("mouseout", hoverEvents.mouseOut);
    }

    updateSimulation() {
        this.simulation
            .on("tick", d => {
                this.nodes
                    .attr("cx", d => Math.min(Math.max(d.x, 0), this.width))
                    .attr("cy", d => Math.min(Math.max(d.y, 0), this.height))
                this.nodeText
                    .attr("x", d => Math.min(Math.max(d.x, 0), this.width))
                    .attr("y", d => Math.min(Math.max(d.y, 0), this.height))
                this.links
                    .attr("x1", d => Math.min(Math.max(d.source.x, 0), this.width))
                    .attr("y1", d => Math.min(Math.max(d.source.y, 0), this.height))
                    .attr("x2", d => Math.min(Math.max(d.target.x, 0), this.width))
                    .attr("y2", d => Math.min(Math.max(d.target.y, 0), this.height))
            });
    }

}

export default Network;