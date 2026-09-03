import { ExecArgs } from "@medusajs/framework/types"

export default async function seedReviews({ container }: ExecArgs) {
  console.log("--------------------------------------------------")
  console.log("SEEDING SAMPLE CUSTOMER REVIEWS")
  console.log("--------------------------------------------------")

  const reviewService = container.resolve("reviewModuleService")
  const productModule = container.resolve("product")

  const products = await productModule.listProducts({}, { take: 25 })
  if (!products.length) {
    console.log("No products available to review.")
    return
  }

  const reviewTemplates = [
    {
      rating: 5,
      title: "Incredible quality and fit!",
      content: "Fabric feels super premium, stitching is crisp, and it held its shape perfectly after two washes. Definitely ordering more colors.",
      customer_name: "Rohan S.",
    },
    {
      rating: 5,
      title: "Best purchase this month",
      content: "Drapes really nicely and the material is breathable for daily wear. Exceeded my expectations for the price point.",
      customer_name: "Priya K.",
    },
    {
      rating: 4,
      title: "Great style, slightly relaxed",
      content: "The cut is very modern and comfortable. If you prefer a tighter slim fit, size down, otherwise true to size.",
      customer_name: "Amit V.",
    },
    {
      rating: 5,
      title: "Fast shipping and fantastic comfort",
      content: "Arrived in 3 days. Packed neatly in recyclable packaging. 10/10 quality!",
      customer_name: "Sneha D.",
    },
    {
      rating: 5,
      title: "Tech features work flawlessly",
      content: "Battery lasts as advertised and the display is super vibrant outdoors. Very impressed with the build quality.",
      customer_name: "Karan M.",
    },
  ]

  let reviewCount = 0
  for (let i = 0; i < Math.min(products.length, 15); i++) {
    const p = products[i]
    const template = reviewTemplates[i % reviewTemplates.length]
    const orderId = `order_seed_${100 + i}`
    const lineItemId = `item_seed_${100 + i}`

    try {
      await reviewService.createProductReviews({
        order_id: orderId,
        order_line_item_id: lineItemId,
        product_id: p.id,
        customer_name: template.customer_name,
        rating: template.rating,
        title: template.title,
        content: template.content,
      })
      reviewCount++
    } catch {
      // ignore duplicate seed runs
    }
  }

  console.log(`✔ Created ${reviewCount} verified customer reviews for top products.`)
  console.log("--------------------------------------------------")
}
