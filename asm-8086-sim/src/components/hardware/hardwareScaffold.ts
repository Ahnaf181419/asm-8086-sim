// The Hardware Lab's "Add Boilerplate" button must agree with the assembler
// about what counts as bare trainer-style code. This module used to carry its
// own copy of the predicate; the two drifted apart once already (commit
// 82091a8) and had to be manually resynchronised. There is now exactly one
// definition, in the engine, and this is a re-export of it.
export { isBareAsm } from '../../engine/assembler'
