import { Trip, Debt, Member } from '../types';

export const SplitService = {
  calculateBalances: (trip: Trip): Trip => {
    const membersMap = new Map<string, Member>();
    
    // Reset balances
    trip.members.forEach(m => {
      membersMap.set(m.id, { ...m, totalPaid: 0, balance: 0 });
    });

    trip.expenses.forEach(expense => {
      const amount = expense.amount;
      const paidBy = expense.paidByMemberId;
      const splitAmong = expense.splitAmongMemberIds;
      const splitType = expense.splitType || 'EQUAL';
      const splitValues = expense.splitValues || {};
      
      // Add to paidBy
      const payer = membersMap.get(paidBy);
      if (payer) {
        payer.totalPaid += amount;
        payer.balance += amount; // They paid, so they are owed this amount initially
      }

      // Subtract from splitters (Debtors)
      if (splitAmong.length > 0) {
        
        splitAmong.forEach(memberId => {
          const member = membersMap.get(memberId);
          if (member) {
            let amountOwed = 0;

            if (splitType === 'EQUAL') {
               amountOwed = amount / splitAmong.length;
            } else if (splitType === 'EXACT') {
               amountOwed = splitValues[memberId] || 0;
            } else if (splitType === 'PERCENT') {
               const percentage = splitValues[memberId] || 0;
               amountOwed = (amount * percentage) / 100;
            }

            member.balance -= amountOwed; // They consumed, so they owe this amount
          }
        });
      }
    });

    // Calculate total expense (excluding settlements)
    // We assume any expense titled 'Settlement' is an internal transfer, not a trip cost.
    const realExpenses = trip.expenses.filter(e => e.title !== 'Settlement');

    return {
      ...trip,
      members: Array.from(membersMap.values()),
      totalExpense: realExpenses.reduce((sum, e) => sum + e.amount, 0)
    };
  },

  minimizeDebts: (trip: Trip): Debt[] => {
    // 1. Separate into debtors (negative balance) and creditors (positive balance)
    let debtors: { id: string; amount: number }[] = [];
    let creditors: { id: string; amount: number }[] = [];

    trip.members.forEach(m => {
      const bal = m.balance;
      // Round to 2 decimals to avoid floating point errors
      const roundedBal = Math.round(bal * 100) / 100;
      if (roundedBal < -0.01) debtors.push({ id: m.id, amount: roundedBal });
      if (roundedBal > 0.01) creditors.push({ id: m.id, amount: roundedBal });
    });

    // Sort by magnitude to optimize matching (Greedy approach)
    debtors.sort((a, b) => a.amount - b.amount); // Most negative first
    creditors.sort((a, b) => b.amount - a.amount); // Most positive first

    const debts: Debt[] = [];
    let i = 0; // debtor index
    let j = 0; // creditor index

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];

      // The amount to settle is the minimum of debt or credit
      const amount = Math.min(Math.abs(debtor.amount), creditor.amount);
      
      // Find names
      const debtorName = trip.members.find(m => m.id === debtor.id)?.name || 'Unknown';
      const creditorName = trip.members.find(m => m.id === creditor.id)?.name || 'Unknown';

      debts.push({
        from: debtorName,
        to: creditorName,
        amount: Math.round(amount * 100) / 100
      });

      // Adjust remaining amounts
      debtor.amount += amount;
      creditor.amount -= amount;

      // Move indices if settled (allow small float error margin)
      if (Math.abs(debtor.amount) < 0.01) i++;
      if (creditor.amount < 0.01) j++;
    }

    return debts;
  }
};