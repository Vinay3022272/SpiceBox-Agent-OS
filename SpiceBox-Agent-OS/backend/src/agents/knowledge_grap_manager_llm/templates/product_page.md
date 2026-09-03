---
type: product
slug: {{ slug }}
name: {{ name }}
brand: {{ brand }}
category: {{ category }}
last_updated: {{ last_updated }}
sources: {{ sources | join(', ') }}
---

# {{ name }}

## Overview

{{ description }}

## Specifications

{% for key, value in specifications.items() %}
- **{{ key }}**: {{ value }}
{% endfor %}

## Pricing

- **Price**: {{ price }} {{ currency }}
{% if original_price %}
- **Original Price**: {{ original_price }} {{ currency }}
- **Discount**: {{ discount }}
{% endif %}

## Customer Sentiment

{% if sentiment %}
- **Overall Rating**: {{ sentiment.avg_rating }}/5 ({{ sentiment.total_reviews }} reviews)
- **Summary**: {{ sentiment.sentiment_summary }}

### What Customers Like

{% for pro in sentiment.top_pros %}
- {{ pro }}
{% endfor %}

### Common Complaints

{% for con in sentiment.top_cons %}
- {{ con }}
{% endfor %}

### Best Reviews

{% for review in sentiment.best_reviews %}
> **"{{ review.title }}"** — {{ review.reviewer }} ({{ review.rating }}/5)
> {{ review.excerpt }}

{% endfor %}
{% else %}
_No review data available yet._
{% endif %}

{% if conflicts %}
## Data Conflicts

{% for conflict in conflicts %}
> **Data Conflict: {{ conflict.field }}**
> Previous: `{{ conflict.existing_value }}` (Source: {{ conflict.existing_source }})
> New: `{{ conflict.new_value }}` (Source: {{ conflict.new_source }})
> Status: _{{ conflict.resolution }}_

{% endfor %}
{% endif %}

## Related

{% for link in related_links %}
- {{ link }}
{% endfor %}

## Sources

{% for source in sources %}
- `{{ source }}`
{% endfor %}
