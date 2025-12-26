// Database initialization script
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function initializeDatabase() {
  console.log('Initializing database...');
  
  try {
    // Initialize default sources
    const defaultSources = [
      {
        name: 'MediaTakeOut',
        url: 'https://mediatakeout.com',
        enabled: true,
        credibilityRating: 6,
        type: 'scrape'
      },
      {
        name: 'The Shade Room',
        url: 'https://theshaderoom.com',
        type: 'rss',
        rssUrl: 'https://theshaderoom.com/feed/',
        enabled: true,
        credibilityRating: 7
      },
      {
        name: 'Baller Alert',
        url: 'https://balleralert.com',
        type: 'rss',
        rssUrl: 'https://balleralert.com/feed/',
        enabled: true,
        credibilityRating: 7
      },
      {
        name: 'TMZ',
        url: 'https://www.tmz.com',
        type: 'rss',
        rssUrl: 'https://www.tmz.com/rss.xml',
        enabled: true,
        credibilityRating: 8
      },
      {
        name: 'E! News',
        url: 'https://www.eonline.com',
        type: 'rss',
        rssUrl: 'https://www.eonline.com/syndication/feeds/rssfeeds/topstories.xml',
        enabled: true,
        credibilityRating: 8
      },
      {
        name: 'People Magazine',
        url: 'https://people.com',
        type: 'rss',
        rssUrl: 'https://people.com/feed/',
        enabled: true,
        credibilityRating: 9
      },
      {
        name: 'Essence',
        url: 'https://www.essence.com',
        type: 'rss',
        rssUrl: 'https://www.essence.com/feed/',
        enabled: true,
        credibilityRating: 9
      },
      {
        name: 'The Root',
        url: 'https://www.theroot.com',
        type: 'rss',
        rssUrl: 'https://www.theroot.com/rss',
        enabled: true,
        credibilityRating: 8
      }
    ];
    
    console.log('Creating default sources...');
    for (const source of defaultSources) {
      try {
        await prisma.source.upsert({
          where: { name: source.name },
          update: {},
          create: source
        });
        console.log(`✓ Created/verified source: ${source.name}`);
      } catch (error) {
        console.error(`✗ Error creating source ${source.name}:`, error.message);
      }
    }
    
    // Initialize default settings
    const defaultSettings = [
      { key: 'refreshInterval', value: '6' },
      { key: 'emailTime', value: '08:00' },
      { key: 'enableRecommendations', value: 'true' }
    ];
    
    console.log('\nCreating default settings...');
    for (const setting of defaultSettings) {
      try {
        await prisma.setting.upsert({
          where: { key: setting.key },
          update: {},
          create: setting
        });
        console.log(`✓ Created/verified setting: ${setting.key}`);
      } catch (error) {
        console.error(`✗ Error creating setting ${setting.key}:`, error.message);
      }
    }
    
    // Add default email recipients from environment
    const defaultEmails = process.env.DEFAULT_EMAIL_RECIPIENTS?.split(',') || [];
    
    if (defaultEmails.length > 0) {
      console.log('\nAdding default email recipients...');
      for (const email of defaultEmails) {
        const trimmedEmail = email.trim();
        if (trimmedEmail) {
          try {
            await prisma.emailRecipient.upsert({
              where: { email: trimmedEmail },
              update: {},
              create: { email: trimmedEmail, active: true }
            });
            console.log(`✓ Added/verified email: ${trimmedEmail}`);
          } catch (error) {
            console.error(`✗ Error adding email ${trimmedEmail}:`, error.message);
          }
        }
      }
    }
    
    console.log('\n✅ Database initialization complete!');
    console.log('\nYou can now:');
    console.log('1. Start the development server: npm run dev');
    console.log('2. Fetch initial news: Visit http://localhost:3000/settings and click "Fetch News Now"');
    console.log('3. Configure email settings in the .env file');
    
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

initializeDatabase();
