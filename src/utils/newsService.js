import {
    getNewsCache, saveNewsCache,
    getNewsCacheDate, saveNewsCacheDate,
    getBookmarks, saveBookmarks,
    getNewsRead, saveNewsRead,
} from './storage';
import { getToday } from './helpers';

// ─── GNews API (free tier: 100 req/day, 10 articles/req) ───
// Sign up at https://gnews.io to get a free API key
const GNEWS_API_KEY = ''; // Add your free API key here
const GNEWS_URL = 'https://gnews.io/api/v4/search';

// ─── Fallback curated articles ───
const FALLBACK_NEWS = [
    {
        id: 'f1', title: "GPT-5 Architecture Details Reveal Mixture of Experts Scaling",
        summary: "New documents reveal that GPT-5 uses a 16-expert MoE architecture with dynamic routing, potentially 10x more efficient than GPT-4. The model reportedly achieves human-level performance on several benchmarks previously thought unreachable.",
        content: "The latest generation of large language models is pushing the boundaries of what's possible with artificial intelligence. GPT-5's rumored architecture uses a Mixture of Experts (MoE) approach, where multiple specialized sub-networks handle different types of inputs. This allows the model to be significantly more parameter-efficient while maintaining or exceeding the performance of dense models.\n\nThe MoE architecture works by routing each input token to a subset of 'expert' networks rather than processing through every parameter. This means that while the total model may have trillions of parameters, only a fraction are active for any given input, dramatically reducing computational costs.\n\nEarly benchmarks suggest the model achieves near-perfect scores on mathematical reasoning, coding challenges, and scientific knowledge tests. The implications for research, education, and industry are enormous.",
        image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=340&fit=crop",
        source: "AI Research Daily", url: "https://arxiv.org", date: "2026-02-13", category: "AI",
    },
    {
        id: 'f2', title: "DeepMind's AlphaFold 4 Achieves Drug Discovery Breakthrough",
        summary: "AlphaFold 4 can now predict drug-protein interactions with 98% accuracy, dramatically accelerating the pharmaceutical R&D pipeline.",
        content: "DeepMind's latest protein structure prediction model, AlphaFold 4, represents a quantum leap in computational biology. The system can now not only predict protein structures with atomic accuracy but also model how potential drug molecules interact with target proteins.\n\nThis capability has been the holy grail of computational drug discovery for decades. Traditional methods require months of laboratory work to test each drug candidate against a target protein. AlphaFold 4 can simulate these interactions in seconds.\n\nMultiple pharmaceutical companies have already begun integrating AlphaFold 4 into their R&D pipelines, with several promising drug candidates entering clinical trials based on the model's predictions.",
        image: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=600&h=340&fit=crop",
        source: "Nature ML", url: "https://deepmind.google", date: "2026-02-12", category: "ML",
    },
    {
        id: 'f3', title: "Meta Releases Open-Source LLaMA 4 with 405B Parameters",
        summary: "Meta's latest open-source model matches GPT-4 Turbo performance while remaining freely available with a novel 'Gated Sparse Attention' mechanism.",
        content: "Meta has released LLaMA 4, their most powerful open-source language model to date with 405 billion parameters. The model introduces a novel attention mechanism called 'Gated Sparse Attention' (GSA) that allows it to process 128,000 tokens of context while using significantly less memory than traditional attention.\n\nBenchmarks show LLaMA 4 matching or exceeding GPT-4 Turbo across a wide range of tasks including coding, math, reasoning, and creative writing. The model is freely available under Meta's open-source license.\n\nThe release has major implications for the democratization of AI, as researchers and developers worldwide can now access a state-of-the-art model without API costs or corporate dependencies.",
        image: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=600&h=340&fit=crop",
        source: "Meta AI Blog", url: "https://ai.meta.com", date: "2026-02-11", category: "DL",
    },
    {
        id: 'f4', title: "State Space Models Outperform Transformers on Long Sequences",
        summary: "Mamba-3, a state space model architecture, surpasses Transformer performance on sequences longer than 1M tokens while using 4x less compute.",
        content: "A new class of sequence models based on state space architectures is challenging the dominance of Transformers. Mamba-3, the latest iteration, demonstrates superior performance on extremely long sequences while maintaining linear computational complexity.\n\nUnlike Transformers whose attention mechanism scales quadratically with sequence length, Mamba-3 processes sequences in linear time, making it practical for tasks like analyzing entire codebases, processing long documents, or handling continuous sensor data streams.",
        image: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=600&h=340&fit=crop",
        source: "arXiv Spotlight", url: "https://arxiv.org", date: "2026-02-10", category: "DL",
    },
    {
        id: 'f5', title: "Gemini 2.0 Ultra Introduces Real-Time Chain-of-Thought Reasoning",
        summary: "Gemini 2.0 Ultra features visible chain-of-thought reasoning, achieving 97% on MATH benchmarks with novel multimodal fusion techniques.",
        content: "Google DeepMind has unveiled Gemini 2.0 Ultra, featuring an innovative real-time reasoning display that shows users exactly how the model arrives at its conclusions. This transparency-first approach represents a significant step toward explainable AI.\n\nThe model achieves a remarkable 97% on the MATH benchmark, previously considered extremely challenging for language models. It also introduces a new multimodal fusion technique that seamlessly integrates text, image, audio, and video understanding.",
        image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&h=340&fit=crop",
        source: "Google AI", url: "https://deepmind.google", date: "2026-02-09", category: "AI",
    },
    {
        id: 'f6', title: "Synthetic Data Now Powers 60% of Enterprise ML Models",
        summary: "New generative techniques produce synthetic datasets indistinguishable from real-world data, transforming how enterprises train ML models.",
        content: "A comprehensive industry study reveals that 60% of enterprise machine learning models now incorporate synthetic data in their training pipelines. Advanced generative models can create realistic tabular, image, and text data that preserves statistical properties while eliminating privacy concerns.\n\nThe trend is driven by increasing data privacy regulations and the high cost of collecting and labeling real-world data. Companies report significant reductions in time-to-production for ML models when using synthetic data augmentation.",
        image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=340&fit=crop",
        source: "DS Weekly", url: "https://datascienceweekly.org", date: "2026-02-08", category: "DS",
    },
    {
        id: 'f7', title: "DPO Replaces RLHF as Preferred Alignment Technique for LLMs",
        summary: "Direct Preference Optimization achieves comparable alignment results with 10x less human annotation effort, making it the new standard.",
        content: "Direct Preference Optimization (DPO) has emerged as the dominant technique for aligning large language models with human preferences. Unlike Reinforcement Learning from Human Feedback (RLHF), DPO eliminates the need for a separate reward model, simplifying the training pipeline significantly.\n\nResearch shows that DPO-trained models are equally helpful and safe as RLHF-trained counterparts while requiring only a fraction of the human annotation data. This makes alignment more accessible to smaller research teams and companies.",
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=340&fit=crop",
        source: "ML Research Hub", url: "https://arxiv.org", date: "2026-02-07", category: "ML",
    },
    {
        id: 'f8', title: "Neural Architecture Search Discovers Novel CNN Beating Vision Transformers",
        summary: "An automated NAS system discovers a convolutional architecture outperforming ViT-Large on ImageNet with 3x fewer FLOPs using 'dynamic kernels'.",
        content: "In a surprising twist, automated Neural Architecture Search has discovered a convolutional neural network design that outperforms the current best Vision Transformers on image classification benchmarks. The architecture uses a novel 'dynamic kernel' approach where convolution filters are generated on-the-fly based on input content.\n\nThis challenges the prevailing narrative that Transformers are universally superior to CNNs for vision tasks and suggests there may be undiscovered architectural innovations waiting to be found through automated search.",
        image: "https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=600&h=340&fit=crop",
        source: "CVPR Previews", url: "https://openaccess.thecvf.com", date: "2026-02-06", category: "DL",
    },
    {
        id: 'f9', title: "AutoML Frameworks Now Handle End-to-End ML Pipelines",
        summary: "New AutoML systems automatically discover, engineer, and select features matching expert-designed pipelines across 40 benchmark datasets.",
        content: "The latest generation of AutoML frameworks has achieved a remarkable milestone: fully automated machine learning pipelines that match or exceed the performance of expert-designed systems. These tools handle everything from data preprocessing and feature engineering to model selection and hyperparameter tuning.",
        image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=340&fit=crop",
        source: "Kaggle Blog", url: "https://kaggle.com", date: "2026-02-05", category: "DS",
    },
    {
        id: 'f10', title: "OpenAI Introduces Multi-Agent Swarms for Complex Tasks",
        summary: "Multiple specialized AI agents collaborate through structured protocols, showing 40% improvement on software engineering benchmarks.",
        content: "OpenAI has released a framework for orchestrating multiple specialized AI agents to collaborate on complex tasks. Each agent has domain expertise, and they communicate through structured protocols to jointly solve problems that are too complex for a single agent.\n\nEarly benchmarks on software engineering tasks show a 40% improvement over single-agent approaches, with particularly strong gains on system design and multi-file refactoring tasks.",
        image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=340&fit=crop",
        source: "OpenAI Blog", url: "https://openai.com", date: "2026-02-04", category: "AI",
    },
    {
        id: 'f11', title: "Federated Learning Goes Mainstream: Privacy-Preserving ML at Scale",
        summary: "Major tech companies deploy federated learning across billions of devices with 100x communication cost reduction.",
        content: "Federated learning has reached mainstream adoption, with major technology companies deploying it across billions of devices worldwide. New gradient compression techniques reduce communication costs by up to 100x, making cross-device federated learning practical for a wide range of applications.",
        image: "https://images.unsplash.com/photo-1563986768609-322da13575f2?w=600&h=340&fit=crop",
        source: "Privacy ML Journal", url: "https://arxiv.org", date: "2026-02-03", category: "ML",
    },
    {
        id: 'f12', title: "Graph Neural Networks Enable Real-Time Fraud Detection at Scale",
        summary: "GNN-based systems process 2 billion daily transactions with 99.7% accuracy, identifying complex fraud patterns traditional ML misses.",
        content: "Graph Neural Networks are revolutionizing fraud detection in financial services. By modeling transaction networks as graphs, GNNs can identify complex fraud patterns involving multiple accounts and transaction chains that traditional ML models completely miss.\n\nPayPal reports their GNN system processes over 2 billion transactions daily with 99.7% accuracy, preventing billions in fraudulent transactions annually.",
        image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=600&h=340&fit=crop",
        source: "FinTech AI", url: "https://engineering.paypal.com", date: "2026-02-02", category: "DS",
    },
    {
        id: 'f13', title: "Diffusion Models Now Generate 4K Video in Real-Time",
        summary: "New architecture enables real-time 4K video generation with temporal consistency maintained across thousands of frames.",
        content: "Researchers have achieved a breakthrough in video generation, with a new diffusion model architecture capable of generating 4K resolution video in real-time. The key innovation is a 'temporal attention' mechanism that ensures consistency across thousands of frames.",
        image: "https://images.unsplash.com/photo-1536240478700-b869070f9279?w=600&h=340&fit=crop",
        source: "SIGGRAPH News", url: "https://arxiv.org", date: "2026-02-01", category: "DL",
    },
    {
        id: 'f14', title: "Causal Inference Meets Deep Learning: New Hybrid Frameworks",
        summary: "Novel frameworks combine causal reasoning with deep learning, enabling models to understand cause-and-effect relationships in data.",
        content: "A new wave of research is merging causal inference methodologies with deep learning architectures. These hybrid frameworks allow neural networks to not just identify correlations but understand causal relationships, leading to more robust and generalizable models.",
        image: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=600&h=340&fit=crop",
        source: "NeurIPS Highlights", url: "https://arxiv.org", date: "2026-01-31", category: "ML",
    },
    {
        id: 'f15', title: "Quantum Machine Learning: IBM Demonstrates Practical Advantage",
        summary: "IBM's quantum processor shows 10x speedup on specific ML tasks compared to classical hardware, marking a practical quantum ML milestone.",
        content: "IBM has demonstrated a practical quantum advantage for machine learning tasks using their latest quantum processor. On specific kernel methods and optimization problems, the quantum system achieved a 10x speedup compared to the best classical hardware.",
        image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&h=340&fit=crop",
        source: "IBM Research", url: "https://research.ibm.com", date: "2026-01-30", category: "AI",
    },
];

/**
 * Fetch AI/ML news articles.
 * Uses GNews API if API key is set, otherwise returns curated fallback articles.
 * Caches results in localStorage for 24 hours.
 */
export async function fetchNews() {
    const today = getToday();
    const cacheDate = getNewsCacheDate();

    // Return cached data if still valid (same day)
    if (cacheDate === today) {
        const cached = getNewsCache();
        if (cached && cached.length > 0) return cached;
    }

    // Try fetching from GNews API
    if (GNEWS_API_KEY) {
        try {
            const queries = ['artificial intelligence', 'machine learning', 'deep learning'];
            const query = queries[Math.floor(Math.random() * queries.length)];
            const res = await fetch(
                `${GNEWS_URL}?q=${encodeURIComponent(query)}&lang=en&max=15&apikey=${GNEWS_API_KEY}`
            );
            if (res.ok) {
                const data = await res.json();
                const articles = (data.articles || []).map((a, i) => ({
                    id: `gnews-${today}-${i}`,
                    title: a.title,
                    summary: a.description || '',
                    content: a.content || a.description || '',
                    image: a.image || `https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=340&fit=crop`,
                    source: a.source?.name || 'Unknown',
                    url: a.url,
                    date: a.publishedAt?.slice(0, 10) || today,
                    category: categorizeArticle(a.title + ' ' + (a.description || '')),
                }));
                if (articles.length > 0) {
                    saveNewsCache(articles);
                    saveNewsCacheDate(today);
                    return articles;
                }
            }
        } catch (err) {
            console.warn('GNews API fetch failed, using fallback:', err);
        }
    }

    // Fallback: use curated articles, rotate subset daily
    const seed = today.split('-').reduce((s, n) => s + parseInt(n), 0);
    const shuffled = [...FALLBACK_NEWS].sort((a, b) => {
        const ha = simpleNumHash(a.id + seed);
        const hb = simpleNumHash(b.id + seed);
        return ha - hb;
    });
    const articles = shuffled.slice(0, 15);
    saveNewsCache(articles);
    saveNewsCacheDate(today);
    return articles;
}

function categorizeArticle(text) {
    const lower = text.toLowerCase();
    if (lower.includes('deep learning') || lower.includes('neural net') || lower.includes('transformer') || lower.includes('diffusion')) return 'DL';
    if (lower.includes('data science') || lower.includes('analytics') || lower.includes('dataset') || lower.includes('feature engineering')) return 'DS';
    if (lower.includes('machine learning') || lower.includes('reinforcement') || lower.includes('supervised') || lower.includes('federated')) return 'ML';
    return 'AI';
}

function simpleNumHash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h);
}
