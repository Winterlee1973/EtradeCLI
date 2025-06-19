#!/usr/bin/env node

import fs from 'fs/promises';

const ORDERS_FILE = 'orders.json';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

// Helper to read orders from file
async function loadOrders() {
  try {
    const data = await fs.readFile(ORDERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, return empty array
    return [];
  }
}

// Display header
function displayHeader() {
  console.log(`${colors.bright}${colors.cyan}╔══════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║                     ORDER STATUS MANAGER                     ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚══════════════════════════════════════════════════════════════╝${colors.reset}\n`);
}

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

// Display orders table
function displayOrders(orders, filter = 'all') {
  // Filter orders based on status
  let filteredOrders = orders;
  if (filter === 'open') {
    filteredOrders = orders.filter(order => order.status === 'PENDING' || order.status === 'OPEN');
  } else if (filter === 'closed') {
    filteredOrders = orders.filter(order => order.status === 'FILLED' || order.status === 'CANCELLED');
  }

  if (filteredOrders.length === 0) {
    console.log(`${colors.yellow}No ${filter === 'all' ? '' : filter + ' '}orders found.${colors.reset}\n`);
    return;
  }

  const filterText = filter === 'all' ? 'All Orders' : 
                    filter === 'open' ? 'Open Orders' : 'Closed Orders';
  
  console.log(`${colors.bright}${filterText} (${filteredOrders.length}):${colors.reset}`);
  console.log(`${colors.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}# │ Symbol │ Type │ Strike │ Exp Date   │ Qty │ Price    │ Status    │ Date/Time Entered${colors.reset}`);
  console.log(`${colors.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  
  filteredOrders.forEach((order, index) => {
    const statusColor = order.status === 'FILLED' ? colors.green : 
                       order.status === 'PENDING' || order.status === 'OPEN' ? colors.yellow : 
                       order.status === 'CANCELLED' ? colors.red : colors.white;
    
    const enteredDateTime = new Date(order.timestamp).toLocaleString('en-US', {
      timeZone: 'America/New_York',
      month: '2-digit',
      day: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    console.log(
      `${(index + 1).toString().padEnd(1)} │ ${order.symbol.padEnd(6)} │ ${order.type.padEnd(4)} │ ${order.strike.toString().padEnd(6)} │ ${order.expDate.padEnd(10)} │ ${order.quantity.toString().padEnd(3)} │ ${formatCurrency(order.price).padEnd(8)} │ ${statusColor}${order.status.padEnd(9)}${colors.reset} │ ${enteredDateTime}`
    );
  });
  console.log(`${colors.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
}

// Display filter options
function displayFilters() {
  console.log(`${colors.bright}Filter Options:${colors.reset}`);
  console.log(`  ${colors.bgBlue}${colors.white} all ${colors.reset} Show all orders`);
  console.log(`  ${colors.bgYellow} open ${colors.reset} Show open orders only`);
  console.log(`  ${colors.bgGreen}${colors.white} closed ${colors.reset} Show closed orders only\n`);
  console.log(`${colors.dim}Usage: node run.js orders [filter]${colors.reset}`);
  console.log(`${colors.dim}Example: node run.js orders open${colors.reset}\n`);
}

// Main function
async function main() {
  // Get filter from command line args
  const filter = process.argv[2] || 'all';
  
  // Validate filter
  if (!['all', 'open', 'closed'].includes(filter)) {
    console.log(`${colors.red}Invalid filter: ${filter}${colors.reset}`);
    console.log(`${colors.dim}Valid filters: all, open, closed${colors.reset}\n`);
    displayFilters();
    return;
  }
  
  displayHeader();
  
  const orders = await loadOrders();
  displayOrders(orders, filter);
  
  if (orders.length > 0) {
    displayFilters();
    
    // Show summary stats
    const openOrders = orders.filter(o => o.status === 'PENDING' || o.status === 'OPEN').length;
    const filledOrders = orders.filter(o => o.status === 'FILLED').length;
    const cancelledOrders = orders.filter(o => o.status === 'CANCELLED').length;
    
    console.log(`${colors.bright}Summary:${colors.reset}`);
    console.log(`  ${colors.yellow}Open: ${openOrders}${colors.reset}  ${colors.green}Filled: ${filledOrders}${colors.reset}  ${colors.red}Cancelled: ${cancelledOrders}${colors.reset}  ${colors.blue}Total: ${orders.length}${colors.reset}`);
  }
}

// Run the app
main().catch(console.error);