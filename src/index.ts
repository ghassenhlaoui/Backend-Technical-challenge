
import express, { Application, Request, Response } from 'express';
import fs from 'fs';


const app = express();
const port = 3000;

app.use(express.json());

const menuData = JSON.parse(fs.readFileSync('./menu.json', 'utf-8'));


// endpoint to retrieve a list of all categories in the menu
app.get('/categories', (req: Request, res: Response) => {
    const categories = menuData.map((category: any) => ({
      id: category.id,
      name: category.name
    }));
    res.json(categories);
  });



// endpoint to fetch information about a specific category using its ID
app.get('/categories/:categoryId', (req: Request, res: Response) => {
    const categoryId = parseInt(req.params.categoryId);
    const category = menuData.find((c: any) => c.id === categoryId);
  
    if (!category) {
      res.status(404).json({ error: 'Category not found' });
    } else {
      res.json(category);
    }
  });



// endpoint to search for products by name
app.get('/search/products', (req: Request, res: Response) => {
  const keyword = req.query.keyword as string;

  const matchingProducts = menuData
    .flatMap((category: any) => category.products)
    .filter((product: any) => product.name.toLowerCase().includes(keyword.toLowerCase()));

  res.json(matchingProducts);
});

// endpoint to remove supplements from a product
app.put('/products/:productId/remove-supplements', (req: Request, res: Response) => {
    const productId = parseInt(req.params.productId);
    const supplementIdsToRemove = req.body.supplementIdsToRemove as number[];

    const product = menuData
      .flatMap((category: any) => category.products)
      .find((p: any) => p.id === productId);
  
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
    } else {

      product.supplements = product.supplements.filter((supplement: any) => !supplementIdsToRemove.includes(supplement.id));
      res.json(product);
    }
  });

  
// endpoint to handle customer orders
app.post('/orders', (req: Request, res: Response) => {
    const { products, happyHourIsActive } = req.body;
   
    // Validate request structure
    if (!Array.isArray(products) || typeof happyHourIsActive !== 'boolean') {
      res.status(400).json({ error: 'Invalid request structure' });
      return;
    }
   
    // Calculate total cost of the order
    let totalCostBeforeDiscount = 0;
    let totalCostAfterDiscount = 0;
    const orderDetails: any[] = [];
   
    products.forEach((orderedProduct: any) => {
      const product = menuData
        .flatMap((category: any) => category.products)
        .find((p: any) => p.id === orderedProduct.id);
   
      if (product) {
        const productPrice = happyHourIsActive ? product.happyHourPrice : product.price;
   
        const supplements = product.supplements.filter((supplement: any) =>
          orderedProduct.supplements.includes(supplement.id)
        );
   
        const supplementPrices = supplements.map((supplement: any) =>
          happyHourIsActive ? supplement.happyHourPrice : supplement.price
        );
   
        const productTotalPrice = productPrice + supplementPrices.reduce((acc: number, val: number) => acc + val, 0);
   
        totalCostBeforeDiscount += productTotalPrice;
        totalCostAfterDiscount += happyHourIsActive ? productTotalPrice * 0.9 : productTotalPrice;
   
        orderDetails.push({
          product: product.name,
          price: productPrice,
          happyHourPrice: product.happyHourPrice,
          supplements: supplements.map((supplement: any) => ({
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
