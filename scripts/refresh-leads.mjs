import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Deleting all current leads...");
  const deleteResult = await prisma.lead.deleteMany({});
  console.log(`Deleted ${deleteResult.count} leads.`);

  console.log("\nPulling new listings for zip code 30005 (this might take a minute)...");
  
  // Hit the local API endpoint to trigger the fetch logic
  try {
    const response = await fetch("http://localhost:3000/api/leads/fetch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        zipCode: "30005",
        limit: 500 // Can be increased up to 1500 max
      }),
    });

    const data = await response.json();
    console.log("Fetch result:", data);
  } catch (err) {
    console.error("Error hitting fetch endpoint:", err);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
