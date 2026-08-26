---
type: category
slug: {{ slug }}
name: {{ name }}
last_updated: {{ last_updated }}
product_count: {{ products | length }}
---

# {{ name }}

## Overview

{{ description }}

## Products in this Category

| Product | Brand | Price | Rating | Reviews |
| --- | --- | --- | --- | --- |
{% for product in products %}
| [{{ product.name }}](../products/{{ product.slug }}.md) | {{ product.brand }} | {{ product.price }} {{ product.currency }} | {{ product.rating }}/5 | {{ product.review_count }} |
{% endfor %}

{% if top_rated %}
## Top Rated

{% for product in top_rated %}
1. **{{ product.name }}** — {{ product.rating }}/5 ({{ product.review_count }} reviews)
{% endfor %}
{% endif %}

{% if price_range %}
## Price Range

- **Lowest**: {{ price_range.min }} {{ currency }}
- **Highest**: {{ price_range.max }} {{ currency }}
- **Average**: {{ price_range.avg }} {{ currency }}
{% endif %}

## Category Trends

{{ trends }}

## Sources

{% for source in sources %}
- `{{ source }}`
{% endfor %}
