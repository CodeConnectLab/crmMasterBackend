// class BloomFilter {
//     constructor(size = 10000, hashFunctions = 4) {
//       this.size = size;
//       this.hashCount = hashFunctions;
//       this.bitArray = new Array(size).fill(0);
//     }
  
//     add(item) {
//       const hashes = this._getHashes(item);
//       hashes.forEach(hash => {
//         this.bitArray[hash] = 1;
//       });
//     }
  
//     mightContain(item) {
//       const hashes = this._getHashes(item);
//       return hashes.every(hash => this.bitArray[hash] === 1);
//     }
  
//     clear() {
//       this.bitArray = new Array(this.size).fill(0);
//     }
  
//     _getHashes(item) {
//       const hashes = [];
//       for (let i = 0; i < this.hashCount; i++) {
//         const hash = Math.abs(
//           item.split('').reduce((acc, char) => {
//             return ((acc << 5) - acc + char.charCodeAt(0) + i) | 0;
//           }, 0)
//         ) % this.size;
//         hashes.push(hash);
//       }
//       return hashes;
//     }
//   }
  
//   module.exports = BloomFilter;



// server/utility/BloomFilter/BloomFilter.js
class BloomFilter {
    constructor(size = 10000, numHashFunctions = 4) {
      this.size = size;
      this.numHashFunctions = numHashFunctions;
      this.bitArray = Buffer.alloc(Math.ceil(size / 8));
    }
  
    hash(value, seed) {
      let hash = 0;
      for (let i = 0; i < value.length; i++) {
        hash = ((hash << 5) + hash) + value.charCodeAt(i) + seed;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash % this.size);
    }
  
    add(value) {
      for (let i = 0; i < this.numHashFunctions; i++) {
        const index = this.hash(value, i);
        const byteIndex = Math.floor(index / 8);
        const bitIndex = index % 8;
        this.bitArray[byteIndex] |= (1 << bitIndex);
      }
    }
  
    mightContain(value) {
      for (let i = 0; i < this.numHashFunctions; i++) {
        const index = this.hash(value, i);
        const byteIndex = Math.floor(index / 8);
        const bitIndex = index % 8;
        if (!(this.bitArray[byteIndex] & (1 << bitIndex))) {
          return false;
        }
      }
      return true;
    }
  
    clear() {
      this.bitArray.fill(0);
    }
  }
  
  module.exports = BloomFilter;
  
  // Usage example:
  /*
  const filter = new BloomFilter(10000, 4);
  
  // Add some values
  filter.add('test1');
  filter.add('test2');
  
  // Check if values might exist
  console.log(filter.mightContain('test1')); // true
  console.log(filter.mightContain('test3')); // false
  
  // Clear the filter
  filter.clear();
  */