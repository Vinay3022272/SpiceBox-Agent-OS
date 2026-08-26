---
type: popular
slug: {{ slug }}
name: {{ name }}
category: {{ category }}
ranking: {{ ranking }}
last_updated: {{ last_updated }}
---

# {{ name }} — Popular Item

## Why It's Popular

{{ popularity_reason }}

## Quick Stats

- **Category**: [{{ category }}](../../knowledge/categories/{{ category_slug }}.md)
- **Rating**: {{ rating }}/5
- **Reviews**: {{ review_count }}
- **Price**: {{ price }} {{ currency }}

## Key Selling Points

{% for point in selling_points %}
- {{ point }}
{% endfor %}

## Customer Highlights

{% for highlight in customer_highlights %}
> "{{ highlight }}"
{% endfor %}

## Recommended Pairings

{% for pairing in pairings %}
- {{ pairing }}
{% endfor %}

## Revenue Recommendation

{{ revenue_recommendation }}

## Sources

{% for source in sources %}
- `{{ source }}`
{% endfor %}
