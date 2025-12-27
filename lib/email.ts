import nodemailer from 'nodemailer';
import { prisma } from './prisma';
import { generateEmailTemplate, generateEmailPlainText } from './email-templates';
import { logger, logPerformance } from './logger';

export interface EmailArticle {
  title: string;
  summary: string;
  url: string;
  imageUrl?: string | null;
  credibilityRating: number;
  source: {
    name: string;
  };
}

// Create email transporter
export function createEmailTransporter() {
  // Check if using SendGrid
  if (process.env.SENDGRID_API_KEY) {
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY,
      },
    });
  }
  
  // Use SMTP configuration
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
}

// Get top articles for email (personalized based on ratings)
export async function getTopArticlesForEmail(limit: number = 10): Promise<EmailArticle[]> {
  // Get articles from the last 24 hours
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Get user rating preferences
  const userRatings = await prisma.userRating.findMany({
    include: {
      article: {
        include: {
          source: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 100 // Consider last 100 ratings
  });
  
  // Calculate preferred celebrities and categories
  const preferredCelebrities = new Set<string>();
  const highRatedArticles = userRatings.filter(r => r.rating >= 4);
  
  highRatedArticles.forEach(rating => {
    rating.article.celebrities.forEach(celeb => preferredCelebrities.add(celeb));
  });
  
  // Fetch recent articles
  let articles = await prisma.article.findMany({
    where: {
      createdAt: {
        gte: yesterday
      }
    },
    include: {
      source: {
        select: {
          name: true,
          credibilityRating: true,
          credibilityReason: true
        }
      },
      userRatings: true
    },
    orderBy: {
      publishDate: 'desc'
    },
    take: 50
  });
  
  // Score articles based on preferences
  const scoredArticles = articles.map(article => {
    let score = article.credibilityRating;
    
    // Boost score if article mentions preferred celebrities
    const matchedCelebrities = article.celebrities.filter(c => preferredCelebrities.has(c));
    score += matchedCelebrities.length * 2;
    
    // Boost score based on average user ratings
    if (article.userRatings.length > 0) {
      const avgRating = article.userRatings.reduce((sum, r) => sum + r.rating, 0) / article.userRatings.length;
      score += avgRating;
    }
    
    return { ...article, score };
  });
  
  // Sort by score and return top articles
  scoredArticles.sort((a, b) => b.score - a.score);
  
  return scoredArticles.slice(0, limit).map(article => ({
    title: article.title,
    summary: article.summary,
    url: article.url,
    imageUrl: article.imageUrl,
    credibilityRating: article.credibilityRating,
    source: {
      name: article.source.name
    }
  }));
}

// Send daily email summary
export async function sendDailyEmailSummary() {
  try {
    logger.info('Starting daily email summary...');
    const startTime = Date.now();
    
    // Get active email recipients
    const recipients = await prisma.emailRecipient.findMany({
      where: { active: true }
    });
    
    if (recipients.length === 0) {
      logger.info('No active email recipients found');
      return { sent: 0, failed: 0 };
    }
    
    // Get top articles
    const articles = await getTopArticlesForEmail(10);
    
    if (articles.length === 0) {
      logger.info('No articles found for email');
      return { sent: 0, failed: 0 };
    }
    
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const emailHTML = generateEmailTemplate({
      articles,
      appUrl,
      templateType: 'daily',
    });
    const emailPlainText = generateEmailPlainText({
      articles,
      appUrl,
      templateType: 'daily',
    });
    const transporter = createEmailTransporter();
    
    const fromEmail = process.env.SENDGRID_FROM || process.env.SMTP_FROM || process.env.SMTP_USER;
    
    let sentCount = 0;
    let failedCount = 0;
    
    // Send email to each recipient
    for (const recipient of recipients) {
      try {
        await transporter.sendMail({
          from: fromEmail,
          to: recipient.email,
          subject: `📰 Your Daily Pop Culture News - ${new Date().toLocaleDateString()}`,
          html: emailHTML,
          text: emailPlainText,
        });
        
        sentCount++;
        logger.info(`Email sent to ${recipient.email}`);
      } catch (error) {
        failedCount++;
        logger.error(`Error sending email to ${recipient.email}`, { error });
      }
    }
    
    logPerformance({
      route: '/email/daily-summary',
      method: 'CRON',
      statusCode: 200,
      responseTime: Date.now() - startTime,
      cacheHit: false,
    });
    
    logger.info('Daily email summary completed', { sentCount, failedCount, recipientCount: recipients.length, articleCount: articles.length });
    return { sent: sentCount, failed: failedCount };
  } catch (error) {
    logger.error('Error in sendDailyEmailSummary', { error });
    throw error;
  }
}

// Test email function
export async function sendTestEmail(recipientEmail: string) {
  try {
    const articles = await getTopArticlesForEmail(3);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    const emailHTML = generateEmailTemplate({
      articles,
      appUrl,
      templateType: 'daily',
    });
    const emailPlainText = generateEmailPlainText({
      articles,
      appUrl,
      templateType: 'daily',
    });
    
    const transporter = createEmailTransporter();
    const fromEmail = process.env.SENDGRID_FROM || process.env.SMTP_FROM || process.env.SMTP_USER;
    
    await transporter.sendMail({
      from: fromEmail,
      to: recipientEmail,
      subject: '🧪 Test Email - Pop Culture News App',
      html: emailHTML,
      text: emailPlainText,
    });
    
    logger.info('Test email sent successfully', { recipientEmail });
    return { success: true, message: 'Test email sent successfully' };
  } catch (error: any) {
    logger.error('Error sending test email', { error, recipientEmail });
    return { success: false, message: error.message };
  }
}
