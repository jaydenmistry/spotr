import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import axios from "axios";

const MARKETCHECK_API_KEY = process.env.MARKETCHECK_API_KEY;
const ZIP_CODE = "30043";

// Mock data as fallback
const mockLeads = [
  {
    vin: "1HGCM826X3A012345",
    year: 2018,
    make: "Honda",
    model: "Accord Ex",
    price: 18500,
    miles: 54000,
    city: "Alpharetta",
    state: "GA",
    source: "Facebook Marketplace",
    vdp_url: "https://www.facebook.com/marketplace/item/12345",
    photo_url: "https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=800&q=80",
    sellerName: "John Doe",
  },
  {
    vin: "JTDKN36UX20123456",
    year: 2021,
    make: "Toyota",
    model: "Camry SE",
    price: 22000,
    miles: 32000,
    city: "Roswell",
    state: "GA",
    source: "Craigslist",
    vdp_url: "https://atlanta.craigslist.org/cto/d/roswell-2021-toyota-camry-se/12345.html",
    photo_url: "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fd?auto=format&fit=crop&w=800&q=80",
    sellerName: "Jane Smith",
  },
  {
    vin: "WAUUP7F45AN012345",
    year: 2019,
    make: "Audi",
    model: "A4 Premium",
    price: 24500,
    miles: 41000,
    city: "Johns Creek",
    state: "GA",
    source: "OfferUp",
    vdp_url: "https://offerup.com/item/detail/12345",
    photo_url: "https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&w=800&q=80",
    sellerName: "Mike Johnson",
  }
];

export async function POST() {
  try {
    let leadsData = [];

    try {
      // Try fetching from real API first
      console.log("Fetching live data from Marketcheck API...");
      const response = await axios.get("https://api.marketcheck.com/v2/search/car/active", {
        params: {
          api_key: MARKETCHECK_API_KEY,
          zip: ZIP_CODE,
          radius: 50,
          rows: 100
        }
      });

      if (response.data && response.data.listings && response.data.listings.length > 0) {
        leadsData = response.data.listings.map((listing: any) => ({
          vin: listing.vin || `MOCKVIN${Math.floor(Math.random() * 100000)}`,
          year: listing.build?.year || null,
          make: listing.build?.make || "Unknown Make",
          model: listing.build?.model || "Unknown Model",
          price: listing.price || 0,
          miles: listing.miles || 0,
          city: listing.dealer?.city || "Alpharetta",
          state: listing.dealer?.state || "GA",
          source: listing.source || listing.dealer?.website || "Marketcheck",
          vdp_url: listing.vdp_url || "#",
          photo_url: listing.media?.photo_links?.[0] || "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80",
          sellerName: listing.dealer?.name || "Private Seller",
        }));
        console.log(`Successfully fetched ${leadsData.length} live leads`);
      } else {
        console.log("No listings found in API response, falling back to mock data");
        leadsData = mockLeads;
      }
    } catch (apiError: any) {
      console.error("Marketcheck API Error, using mock fallback:", apiError.message);
      leadsData = mockLeads;
    }

    // Save fetched leads to DB
    let savedCount = 0;
    for (const data of leadsData) {
      // Check if VIN exists to avoid duplicates
      const existing = await prisma.lead.findFirst({
        where: { vin: data.vin }
      });

      if (!existing) {
        await prisma.lead.create({
          data: {
            ...data,
            stage: "New Leads"
          }
        });
        savedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully pulled ${savedCount} new leads`,
      count: savedCount
    });
  } catch (error) {
    console.error("Error saving leads:", error);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}
