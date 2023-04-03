import TransactionData from './TransactionData';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Transaction extends TransactionData { }
class Transaction implements TransactionData {
  constructor(transactionData: TransactionData) {
    Object.assign(this, transactionData);
  }
}
export default Transaction;
