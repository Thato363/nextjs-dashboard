// This file contains placeholder data that you'll be replacing with real data in the Data Fetching chapter:
// https://nextjs.org/learn/dashboard-app/fetching-data
const users = [
  {
    id: '410544b2-4001-4271-9855-fec4b6a6442a',
    name: 'User',
    email: 'user@nextmail.com',
    password: '123456',
    role: 'doctor',
  },
];

const customers = [
  {
    id: 'd6e15727-9fe1-4961-8c5b-ea44a9bd81aa',
    name: 'Evil Rabbit',
    email: 'evil@rabbit.com',
    image_url: '/customers/evil-rabbit.png',
  },
  {
    id: '3958dc9e-712f-4377-85e9-fec4b6a6442a',
    name: 'Delba de Oliveira',
    email: 'delba@oliveira.com',
    image_url: '/customers/delba-de-oliveira.png',
  },
  {
    id: '3958dc9e-742f-4377-85e9-fec4b6a6442a',
    name: 'Lee Robinson',
    email: 'lee@robinson.com',
    image_url: '/customers/lee-robinson.png',
  },
  {
    id: '76d65c26-f784-44a2-ac19-586678f7c2f2',
    name: 'Michael Novotny',
    email: 'michael@novotny.com',
    image_url: '/customers/michael-novotny.png',
  },
  {
    id: 'CC27C14A-0ACF-4F4A-A6C9-D45682C144B9',
    name: 'Amy Burns',
    email: 'amy@burns.com',
    image_url: '/customers/amy-burns.png',
  },
  {
    id: '13D07535-C59E-4157-A011-F8D2EF4E0CBB',
    name: 'Balazs Orban',
    email: 'balazs@orban.com',
    image_url: '/customers/balazs-orban.png',
  },
];

const invoices = [
  {
    id: '1f6f0e1d-7bd8-4b39-b1b9-0357dfd901aa',
    customer_id: customers[0].id,
    amount: 15795,
    status: 'pending',
    date: '2022-12-06',
  },
  {
    id: '3a8be1db-0d9d-4ea3-8212-e58d9d396f9d',
    customer_id: customers[1].id,
    amount: 20348,
    status: 'pending',
    date: '2022-11-14',
  },
  {
    id: 'f5f0611b-32a2-4f39-b719-12dd66a8c1ff',
    customer_id: customers[4].id,
    amount: 3040,
    status: 'paid',
    date: '2022-10-29',
  },
  {
    id: '44ff7d52-8606-4024-80d2-5d69b551917d',
    customer_id: customers[3].id,
    amount: 44800,
    status: 'paid',
    date: '2023-09-10',
  },
  {
    id: '0eb4ccfa-9323-4d9f-a0e7-b2d30f6dc83b',
    customer_id: customers[5].id,
    amount: 34577,
    status: 'pending',
    date: '2023-08-05',
  },
  {
    id: 'c25f3d4e-1e35-43af-a10d-f4d0af2d3326',
    customer_id: customers[2].id,
    amount: 54246,
    status: 'pending',
    date: '2023-07-16',
  },
  {
    id: 'c5dffe93-e6db-4c0b-9079-2f30dcec7fb9',
    customer_id: customers[0].id,
    amount: 666,
    status: 'pending',
    date: '2023-06-27',
  },
  {
    id: 'a5b8d0c2-dcf7-48d3-bd34-7d13a14454c5',
    customer_id: customers[3].id,
    amount: 32545,
    status: 'paid',
    date: '2023-06-09',
  },
  {
    id: '49b8874d-77b2-4600-9d10-e3b5b01d5d89',
    customer_id: customers[4].id,
    amount: 1250,
    status: 'paid',
    date: '2023-06-17',
  },
  {
    id: '1c3202dc-28bb-4483-9ef1-45ed4547b2a4',
    customer_id: customers[5].id,
    amount: 8546,
    status: 'paid',
    date: '2023-06-07',
  },
  {
    id: '6d6cebb8-727b-4f96-8d1d-cd5b21767b34',
    customer_id: customers[1].id,
    amount: 500,
    status: 'paid',
    date: '2023-08-19',
  },
  {
    id: '9e4726d8-31ef-4063-9c33-c7b9f0b3f3e0',
    customer_id: customers[5].id,
    amount: 8945,
    status: 'paid',
    date: '2023-06-03',
  },
  {
    id: '2c890d29-9d7b-4d26-90d3-efb1234194c0',
    customer_id: customers[2].id,
    amount: 1000,
    status: 'paid',
    date: '2022-06-05',
  },
];

const revenue = [
  { month: 'Jan', revenue: 2000 },
  { month: 'Feb', revenue: 1800 },
  { month: 'Mar', revenue: 2200 },
  { month: 'Apr', revenue: 2500 },
  { month: 'May', revenue: 2300 },
  { month: 'Jun', revenue: 3200 },
  { month: 'Jul', revenue: 3500 },
  { month: 'Aug', revenue: 3700 },
  { month: 'Sep', revenue: 2500 },
  { month: 'Oct', revenue: 2800 },
  { month: 'Nov', revenue: 3000 },
  { month: 'Dec', revenue: 4800 },
];

export { users, customers, invoices, revenue };
