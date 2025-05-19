// netlify/functions/prisma-setup.js
const { initializePrisma } = require('../../prisma/prisma-netlify');

exports.handler = async function() {
  try {
    await initializePrisma();
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Prisma setup complete' })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to set up Prisma', details: error.message })
    };
  }
};
