"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const app = (0, express_1.default)();
const port = 3000;
app.use(express_1.default.json());
const menuData = JSON.parse(fs_1.default.readFileSync('./menu.json', 'utf-8'));
// endpoint to retrieve a list of all categories in the menu
app.get('/categories', (req, res) => {
    const categories = menuData.map((category) => ({
        id: category.id,
        name: category.name
    }));
    res.json(categories);
});
// endpoint to fetch information about a specific category using its ID
app.get('/categories/:categoryId', (req, res) => {
    const categoryId = parseInt(req.params.categoryId);
    const category = menuData.find((c) => c.id === categoryId);
    if (!category) {
        res.status(404).json({ error: 'Category not found' });
    }
    else {
        res.json(category);
    }
});
// endpoint to search for products by name
app.get('/search/products', (req, res) => {
    const keyword = req.query.keyword;
    const matchingProducts = menuData
        .flatMap((category) => category.products)
        .filter((product) => product.name.toLowerCase().includes(keyword.toLowerCase()));
    res.json(matchingProducts);
});
// endpoint to remove supplements from a product
app.put('/products/:productId/remove-supplements', (req, res) => {
    const productId = parseInt(req.params.productId);
    const supplementIdsToRemove = req.body.supplementIdsToRemove;
    const product = menuData
        .flatMap((category) => category.products)
        .find((p) => p.id === productId);
    if (!product) {
        res.status(404).json({ error: 'Product not found' });
    }
    else {
        product.supplements = product.supplements.filter((supplement) => !supplementIdsToRemove.includes(supplement.id));
        res.json(product);
    }
});
// Endpoint to handle customer orders
app.post('/orders', (req, res) => {
    const { products, happyHourIsActive } = req.body;
    // Validate request structure
    if (!Array.isArray(products) || typeof happyHourIsActive !== 'boolean') {
        res.status(400).json({ error: 'Invalid request structure' });
        return;
    }
    // Calculate total cost of the order
    let totalCostBeforeDiscount = 0;
    let totalCostAfterDiscount = 0;
    const orderDetails = [];
    products.forEach((orderedProduct) => {
        const product = menuData
            .flatMap((category) => category.products)
            .find((p) => p.id === orderedProduct.id);
        if (product) {
            const productPrice = happyHourIsActive ? product.happyHourPrice : product.price;
            const supplements = product.supplements.filter((supplement) => orderedProduct.supplements.includes(supplement.id));
            const supplementPrices = supplements.map((supplement) => happyHourIsActive ? supplement.happyHourPrice : supplement.price);
            const productTotalPrice = productPrice + supplementPrices.reduce((acc, val) => acc + val, 0);
            totalCostBeforeDiscount += productTotalPrice;
            totalCostAfterDiscount += happyHourIsActive ? productTotalPrice * 0.9 : productTotalPrice;
            orderDetails.push({
                product: product.name,
                price: productPrice,
                happyHourPrice: product.happyHourPrice,
                supplements: supplements.map((supplement) => ({
                    id: supplement.id,
                    name: supplement.name,
                    price: supplement.price,
                    happyHourPrice: supplement.happyHourPrice
                }))
            });
        }
    });
    // Generate the response
    const response = {
        totalCostBeforeDiscount,
        totalCostAfterDiscount,
        discountApplied: totalCostBeforeDiscount !== totalCostAfterDiscount,
        orderDetails
    };
    res.json(response);
});
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
