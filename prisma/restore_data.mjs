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
  console.log('Starting restore...');
  const backupFilePath = 'prisma/db_backup.json';
  
  if (!fs.existsSync(backupFilePath)) {
    console.error(`Error: Backup file not found at ${backupFilePath}`);
    process.exit(1);
  }

  const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));

  try {
    // We clean existing tables in reverse order of dependencies
    console.log('Cleaning existing database tables...');
    await prisma.homeSectionItem.deleteMany();
    await prisma.downloadLink.deleteMany();
    await prisma.episode.deleteMany();
    await prisma.season.deleteMany();
    await prisma.mediaPost.deleteMany();
    await prisma.homeSection.deleteMany();
    await prisma.sEOPage.deleteMany();
    await prisma.scraperCache.deleteMany();
    await prisma.appSettings.deleteMany();

    console.log('Restoring data...');

    // Restore root models
    if (backupData.AppSettings?.length) {
      console.log(`Restoring AppSettings (${backupData.AppSettings.length} records)...`);
      await prisma.appSettings.createMany({ data: backupData.AppSettings });
    }

    if (backupData.ScraperCache?.length) {
      console.log(`Restoring ScraperCache (${backupData.ScraperCache.length} records)...`);
      await prisma.scraperCache.createMany({ data: backupData.ScraperCache });
    }

    if (backupData.SEOPage?.length) {
      console.log(`Restoring SEOPage (${backupData.SEOPage.length} records)...`);
      await prisma.sEOPage.createMany({ data: backupData.SEOPage });
    }

    if (backupData.HomeSection?.length) {
      console.log(`Restoring HomeSection (${backupData.HomeSection.length} records)...`);
      await prisma.homeSection.createMany({ data: backupData.HomeSection });
    }

    // Restore MediaPost structure
    if (backupData.MediaPost?.length) {
      console.log(`Restoring MediaPost (${backupData.MediaPost.length} records)...`);
      await prisma.mediaPost.createMany({ data: backupData.MediaPost });
    }

    if (backupData.Season?.length) {
      console.log(`Restoring Season (${backupData.Season.length} records)...`);
      await prisma.season.createMany({ data: backupData.Season });
    }

    if (backupData.Episode?.length) {
      console.log(`Restoring Episode (${backupData.Episode.length} records)...`);
      await prisma.episode.createMany({ data: backupData.Episode });
    }

    if (backupData.DownloadLink?.length) {
      console.log(`Restoring DownloadLink (${backupData.DownloadLink.length} records)...`);
      await prisma.downloadLink.createMany({ data: backupData.DownloadLink });
    }

    if (backupData.HomeSectionItem?.length) {
      console.log(`Restoring HomeSectionItem (${backupData.HomeSectionItem.length} records)...`);
      await prisma.homeSectionItem.createMany({ data: backupData.HomeSectionItem });
    }

    console.log('Restore completed successfully!');
  } catch (err) {
    console.error('Restore failed:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
