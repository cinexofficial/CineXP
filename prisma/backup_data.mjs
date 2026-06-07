import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting backup...');
  try {
    const backupData = {};

    backupData.MediaPost = await prisma.mediaPost.findMany();
    backupData.Season = await prisma.season.findMany();
    backupData.Episode = await prisma.episode.findMany();
    backupData.DownloadLink = await prisma.downloadLink.findMany();
    backupData.HomeSection = await prisma.homeSection.findMany();
    backupData.HomeSectionItem = await prisma.homeSectionItem.findMany();
    backupData.AppSettings = await prisma.appSettings.findMany();
    backupData.SEOPage = await prisma.sEOPage.findMany();
    backupData.ScraperCache = await prisma.scraperCache.findMany();

    const backupFilePath = 'prisma/db_backup.json';
    fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2));
    
    console.log(`Backup completed successfully! Saved to: ${backupFilePath}`);
    console.log('Stats:');
    for (const [key, val] of Object.entries(backupData)) {
      console.log(`- ${key}: ${val.length} records`);
    }
  } catch (err) {
    console.error('Backup failed:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
