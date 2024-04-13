# Cule filo - AI-powered restaurant search engine

> Discover the top 3 restaurants serving your favorite food near you. Just enter your craving and location in our free AI-powered app, and start your culinary adventure today!. Our submittion to the [Cloudflare AI Challenge.](https://dev.to/devteam/join-us-for-the-cloudflare-ai-challenge-3000-in-prizes-5f99)

**Demo:** https://cule-filo.pages.dev

https://github.com/sjdonado/culefilo/assets/27580836/9c6992b4-81b7-4940-85e3-fe21dbbd41c2

**Team:** [@sjdonado](http://github.com/sjdonado) [@gjhernandez](http://github.com/gjhernandez) [@krthr](http://github.com/krthr)

## Features

1. Search your favorite meal
   <img width="1840" alt="Screenshot 2024-04-13 at 17 23 33" src="https://github.com/sjdonado/culefilo/assets/27580836/d4d31e2e-ece1-424f-bcb1-bec90ab14553">

2. Real time search logs
   <img width="1840" alt="Screenshot 2024-04-13 at 17 11 58" src="https://github.com/sjdonado/culefilo/assets/27580836/5849dcaf-81e7-48d0-909a-d413078d1e78">
   <img width="1840" alt="Screenshot 2024-04-13 at 17 12 59" src="https://github.com/sjdonado/culefilo/assets/27580836/8e9f22b2-fe96-4061-9dfb-b13631a18add">

3. See and share your results

<img width="1840" alt="Screenshot 2024-04-13 at 17 13 41" src="https://github.com/sjdonado/culefilo/assets/27580836/ebf2fba3-0151-4c1c-bda0-039f3b678df5">

## Design

```mermaid
graph TD
    A[Start] --> B{Job state?}
    B -->|Created| C[Update job state to Running]
    B -->|Running or Finished| D[Return encoded message]
    C --> E[Search for places with original query]
    E --> F{Number of places found?}
    F -->|Less than 3| G[Generate suggestions list - llama-2-13b-chat-awq]
    F -->|3 or more| H[Enhancing results]
    G --> I{Number of suggestions?}
    I -->|Greater than 0| J[Search for places with suggestions]
    I -->|0| K[Log error]
    J --> L{Number of places found?}
    L -->|Less than 3| G
    L -->|3 or more| H
    H --> M[Fetch place reviews]
    H --> N[Fetch place photos]
    M --> O[Summarizing reviews - bart-large-cnn]
    N --> P[Photos to text - uform-gen2-qwen-500m]
    P --> Q[Choose thumbnails - llama-2-13b-chat-awq]
    Q ---> R[Collecting results]
    O ---> R
    R --> S[Update job state to Success]
    S --> T[Return encoded message]
    K --> H
```

### Functional requirements

- **Search Results Relevance:** The application should return at least one result that is relevant to the user's search query.
- **Place Descriptions Based on Reviews:** The application should generate descriptions for each place based on the available user reviews. These descriptions should provide a concise and informative summary of the place's characteristics and user experiences.
- **Contextually Relevant Image Selection:** The application should select and display an image for each place that is contextually relevant to the user's search query. This image should accurately represent the place and enhance the user's understanding of the search results.
- **Search History:** The application should maintain a history of the user's previous searches. This feature allows users to easily access and revisit their past searches, enhancing the overall user experience.

### Non Functional requirements

- **Request Completion Time:** The application should strive to complete search requests within an average time of 30 seconds or less. This ensures a smooth and responsive user experience, minimizing waiting times for search results.
- **Intuitive, Minimalist, and Responsive UI/UX:** The user interface and user experience should be designed to be intuitive, minimalist, and responsive. The application should provide a clean and clutter-free interface that is easy to navigate and understand. It should also be responsive, adapting seamlessly to different screen sizes and devices.
- **Search History Storage in Key-Value Store:** The application should store the user's search history in a key-value (KV) store. This allows for efficient retrieval and management of search history data, ensuring fast access to previous searches.

## Local setup

1. Configure secrets `.dev.vars`

```
PLACES_API_KEY={PLACES_API_KEY}
AUTOCOMPLETE_API_KEY={AUTOCOMPLETE_API_KEY}
```

2. Install dependencies

```sh
npm install
```

3. Build with Vite + run bindings with Wrangler:

```sh
npm run preview
```

## Deployment

1. Create a Cloudflare account
1. Create an application under 'Workers & Pages'
1. Checkout the master branch
1. Create KV namespace binding: `CULEFILO_KV`
1. Enable Workers AI Bindings: `AI`
1. Run `npm run deploy`
