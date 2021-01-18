import Network from "./networks.js"
import Distribution from "./distribution.js"

const network = new Network("data/categories.json");
const distribution = new Distribution("data/yelp_culver_city_ratings.csv");

// Update histogram when button is clicked
d3.select("#button").on("click", () => distribution.update());