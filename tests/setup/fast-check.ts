import fc from 'fast-check';

// ARCHITECTURE §9: property tests run 1 000 cases unless a test says otherwise.
fc.configureGlobal({ numRuns: 1000 });
