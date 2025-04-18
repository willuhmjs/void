import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    // Create the endpoint for Loki
    const endpoint = await prisma.endpoint.create({
      data: {
        endpoint: '/loki-push',
        remote_endpoint: 'http://172.18.6.236:3100/loki/api/v1/push',
        method: 'POST' 
      }
    });
    
    console.log('Created endpoint:', endpoint);

    // Create the token
    const token = await prisma.token.create({
      data: {
        token: 'b85073d15eec1dd4ed3adf732c4a4354'
      }
    });
    
    console.log('Created token:', token);
    
    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
