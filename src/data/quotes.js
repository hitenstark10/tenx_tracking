const quotes = [
  { text: "Artificial intelligence is the new electricity.", author: "Andrew Ng" },
  { text: "Machine learning is the last invention that humanity will ever need to make.", author: "Nick Bostrom" },
  { text: "The key to artificial intelligence has always been the representation.", author: "Jeff Hawkins" },
  { text: "AI is probably the most important thing humanity has ever worked on.", author: "Sundar Pichai" },
  { text: "Deep learning is going to be able to do everything.", author: "Geoffrey Hinton" },
  { text: "Data is the new oil. It's valuable, but if unrefined it cannot really be used.", author: "Clive Humby" },
  { text: "The question of whether a computer can think is no more interesting than the question of whether a submarine can swim.", author: "Edsger W. Dijkstra" },
  { text: "By far, the greatest danger of AI is that people conclude too early that they understand it.", author: "Eliezer Yudkowsky" },
  { text: "The development of full artificial intelligence could spell the end of the human race… or be the best thing that's ever happened to us.", author: "Stephen Hawking" },
  { text: "Success in creating AI would be the biggest event in human history.", author: "Stephen Hawking" },
  { text: "A year spent in artificial intelligence is enough to make one believe in God.", author: "Alan Perlis" },
  { text: "In God we trust; all others must bring data.", author: "W. Edwards Deming" },
  { text: "It's going to be interesting to see how society deals with artificial intelligence, but it will definitely be cool.", author: "Colin Angle" },
  { text: "The pace of progress in artificial intelligence is incredibly fast.", author: "Elon Musk" },
  { text: "Neural networks are one of the most beautiful programming paradigms ever invented.", author: "Michael Nielsen" },
  { text: "Gradient descent can find really good solutions to really hard problems.", author: "Yann LeCun" },
  { text: "The cost of training large-scale AI models has been dropping exponentially.", author: "OpenAI Research" },
  { text: "Transfer learning will be the next driver of ML commercial success.", author: "Andrew Ng" },
  { text: "Attention is all you need.", author: "Vaswani et al., 2017" },
  { text: "The best way to predict the future is to invent it.", author: "Alan Kay" },
  { text: "Every model is wrong, but some are useful.", author: "George E. P. Box" },
  { text: "More data beats clever algorithms, but better data beats more data.", author: "Peter Norvig" },
  { text: "If you torture the data long enough, it will confess to anything.", author: "Ronald Coase" },
  { text: "Without big data analytics, companies are blind and deaf, wandering out onto the web like deer on a freeway.", author: "Geoffrey Moore" },
  { text: "The goal is to turn data into information, and information into insight.", author: "Carly Fiorina" },
  { text: "Not everything that can be counted counts, and not everything that counts can be counted.", author: "William Bruce Cameron" },
  { text: "Regularization is all about finding the sweet spot between underfitting and overfitting.", author: "ML Practitioner Wisdom" },
  { text: "The Transformer architecture changed everything in NLP and beyond.", author: "AI Research Community" },
  { text: "Reinforcement learning is how you teach machines to make decisions through trial and error.", author: "Richard Sutton" },
  { text: "The real question is, when will we draft an AI bill of rights?", author: "Gray Scott" },
  { text: "AI doesn't have to be evil to destroy humanity — if AI has a goal and humanity just happens to be in the way, it will destroy humanity.", author: "Elon Musk" },
  { text: "I visualize a time when we will be to robots what dogs are to humans.", author: "Claude Shannon" },
  { text: "Machine learning is like a telescope for the data world — it lets us see things we couldn't before.", author: "Data Science Proverb" },
  { text: "Backpropagation is the workhorse of deep learning.", author: "Geoffrey Hinton" },
  { text: "Dropout is one of the most elegant ideas in neural network regularization.", author: "Nitish Srivastava" },
  { text: "The beauty of a living thing is not the atoms that go into it, but the way those atoms are put together — same with neural nets.", author: "Carl Sagan (adapted)" },
  { text: "Large language models learn a surprising amount about the world just from next-token prediction.", author: "Ilya Sutskever" },
  { text: "Self-supervised learning is the dark matter of intelligence.", author: "Yann LeCun" },
  { text: "Scaling laws suggest that bigger models will keep getting better.", author: "Kaplan et al., 2020" },
  { text: "The unreasonable effectiveness of data.", author: "Alon Halevy, Peter Norvig, Fernando Pereira" },
];

/**
 * Returns a random quote. Changes on every call (each refresh).
 */
export function getRandomQuote() {
  return quotes[Math.floor(Math.random() * quotes.length)];
}

export default quotes;
