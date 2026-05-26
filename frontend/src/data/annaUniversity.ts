export interface SubjectPreset {
  code: string;
  name: string;
  units: string[];
}

export const AU_SUBJECTS: SubjectPreset[] = [
  { code: 'CS3451', name: 'Introduction to Operating Systems', units: ['Introduction', 'Process Management', 'Memory Management', 'Storage Management', 'Virtual Machines & Mobile OS'] },
  { code: 'CS3452', name: 'Theory of Computation', units: ['Automata & Regular Expressions', 'Regular Languages', 'CFG & Push Down Automata', 'Normal Forms & Turing Machines', 'Undecidability'] },
  { code: 'CS3491', name: 'Artificial Intelligence', units: ['Introduction to AI', 'Problem Solving Methods', 'Knowledge Representation', 'Planning & Uncertainty', 'Machine Learning Basics'] },
  { code: 'CS3492', name: 'Database Management Systems', units: ['Relational Model', 'SQL & Relational Algebra', 'Database Design', 'Transaction Management', 'Indexing & Hashing'] },
  { code: 'CS3401', name: 'Algorithms', units: ['Algorithm Analysis', 'Divide & Conquer', 'Greedy Algorithms', 'Dynamic Programming', 'Graph Algorithms'] },
  { code: 'CS3351', name: 'Data Structures', units: ['Linear Data Structures', 'Trees', 'Graphs', 'Hashing', 'Advanced Data Structures'] },
  { code: 'CS3391', name: 'Object Oriented Programming', units: ['OOP Concepts', 'Inheritance & Polymorphism', 'Exception Handling', 'Multithreading', 'Collections & Generics'] },
  { code: 'CS3501', name: 'Compiler Design', units: ['Lexical Analysis', 'Syntax Analysis', 'Semantic Analysis', 'Intermediate Code Generation', 'Code Generation & Optimization'] },
  { code: 'CS3551', name: 'Distributed Computing', units: ['Introduction', 'Message Passing', 'Distributed Shared Memory', 'Distributed File Systems', 'Distributed Coordination'] },
  { code: 'CS3691', name: 'Embedded Systems', units: ['Introduction', 'Processor & Memory', 'Interfacing', 'RTOS Concepts', 'Case Studies'] },
  { code: 'MA3354', name: 'Discrete Mathematics', units: ['Logic & Proofs', 'Set Theory', 'Combinatorics', 'Graph Theory', 'Number Theory'] },
  { code: 'CS3591', name: 'Deep Learning', units: ['Neural Networks', 'CNN', 'RNN & LSTM', 'Transfer Learning', 'Generative Models'] },
  { code: 'CS3301', name: 'Computer Networks', units: ['Network Models', 'Data Link Layer', 'Network Layer', 'Transport Layer', 'Application Layer'] },
  { code: 'CS3311', name: 'Information Security', units: ['Cryptography Basics', 'Symmetric Crypto', 'Asymmetric Crypto', 'Network Security', 'Web Security'] },
  { code: 'CS3701', name: 'Cloud Computing', units: ['Cloud Models', 'Virtualization', 'Storage & Databases', 'Security in Cloud', 'DevOps & Containers'] },
];
