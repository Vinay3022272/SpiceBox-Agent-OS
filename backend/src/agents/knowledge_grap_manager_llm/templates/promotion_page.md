---
type: promotion
slug: {{ slug }}
name: {{ name }}
product_slug: {{ product_slug }}
promotion_type: {{ promotion_type }}
last_updated: {{ last_updated }}
---

# {{ name }}

## Promotion Details

- **Type**: {{ promotion_type }}
- **Product**: [{{ product_name }}](../../knowledge/products/{{ product_slug }}.md)
{% if discount %}
- **Discount**: {{ discount }}
{% endif %}
{% if valid_until %}
- **Valid Until**: {{ valid_until }}
{% endif %}

## Why This Product

{{ why_promote }}

## Selling Points

{% for point in selling_points %}
- {{ point }}
{% endfor %}

{% if customer_evidence %}
## Customer Evidence

{{ customer_evidence }}
{% endif %}

## Recommended For

{% for audience in target_audience %}
- {{ audience }}
{% endfor %}

## Revenue Impact

{{ revenue_note }}

## Sources

{% for source in sources %}
- `{{ source }}`
{% endfor %}
