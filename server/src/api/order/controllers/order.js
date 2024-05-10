'use strict';

/**
 * order controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

//create custon order api
//order in under routes ke under custom-route.js banaye ge 
// Exporting the result of createCoreController function
module.exports = createCoreController('api::order.order', ({ strapi }) => ({
    // Defining an asynchronous function named customOrderController that takes a 'ctx' (context) parameter
    async customOrderController(ctx) {
        try {
            // Extracting the body data from the request context
            const bodyData = ctx.body;

            // Fetching entries from the 'api::product.product' entity with specific fields and a limit of 2
            const entries = await strapi.entityService.findMany('api::product.product', {
                fields: ['title'],
                limit: 2
            });

            // Returning the fetched data as the response
            return { data: entries };
        } catch (err) {
            // Handling errors by setting the response body to the error object
            ctx.body = err;
        }
    },
    //here is overright core controller (core controller is Create ,update ,delete,find)
    //create ko update karege yaha per

    async create(ctx) {
        try {
            const {products} = ctx.request.body;
  
            const lineItems = await Promise.all(products.map(async (product) => {
  
              const productEntities = await strapi.entityService.findMany("api::product.product", {
                  filters: {
                      key: product.key
                  }
              })
              const realProduct = productEntities[0];
                const image = product.image
                return {
                    price_data: {
                      currency: 'inr',
                      product_data: {
                          name: realProduct.title,
                          images: [image]
                      },
                      unit_amount: realProduct.price * 100
                    },
                    quantity: product.quantity
                }
            }));		  
  
            const session = await stripe.checkout.sessions.create({
              shipping_address_collection: {
                  allowed_countries: ['IN']
              },
              line_items: lineItems,
              mode: 'payment',
              success_url: `${process.env.CLIENT_BASE_URL}/payments/success`,
              cancel_url: `${process.env.CLIENT_BASE_URL}/payments/failed`,
            });
  
            await strapi.entityService.create('api::order.order', {
              data: {
                products,
                stripeId: session.id
              },
            });
  
            return {stripeId: session.id};
  
        } catch (error) {
            console.log(error);
            ctx.response.status = 500;
            return error;
        }
    }
}));
