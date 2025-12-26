import nodemailer from 'nodemailer';
import { prisma } from './prisma';

interface EmailArticle {
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

// Generate HTML email template
function generateEmailHTML(articles: EmailArticle[], appUrl: string): string {
  const articlesHTML = articles.map(article => `
    <div style="margin-bottom: 30px; padding: 20px; background: #f9f9f9; border-radius: 8px;">
      ${article.imageUrl ? `
        <img src="${article.imageUrl}" alt="${article.title}" style="max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 15px;" />
      ` : ''}
      <h2 style="margin: 0 0 10px 0; font-size: 20px; color: #333;">
        <a href="${article.url}" style="color: #0066cc; text-decoration: none;">${article.title}</a>
      </h2>
      <div style="margin-bottom: 10px; font-size: 14px; color: #666;">
        <strong>Source:</strong> ${article.source.name} | 
        <strong>Credibility:</strong> ${article.credibilityRating}/10
      </div>
      <p style="margin: 0; color: #555; line-height: 1.6;">${article.summary}</p>
      <a href="${article.url}" style="display: inline-block; margin-top: 10px; padding: 8px 16px; background: #0066cc; color: white; text-decoration: none; border-radius: 4px;">Read More</a>
    </div>
  `).join('');
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Daily Pop Culture News</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <div style="max-width: 600px; margin: 0 auto; background: white; padding: 20px;">
        <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #0066cc;">
          <h1 style="margin: 0; color: #0066cc;">📰 Your Daily Pop Culture News</h1>
          <p style="margin: 10px 0 0 0; color: #666;">The latest celebrity news and gossip</p>
        </div>
        
        <div style="padding: 20px 0;">
          ${articlesHTML}
        </div>
        
        <div style="text-align: center; padding: 20px; border-top: 2px solid #eee; margin-top: 20px;">
          <p style="margin: 0 0 10px 0; color: #666;">Want to see more?</p>
          <a href="${appUrl}" style="display: inline-block; padding: 12px 24px; background: #0066cc; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">Visit News App</a>
        </div>
        
        <div style="text-align: center; padding: 20px 0; color: #999; font-size: 12px;">
          <p style="margin: 0;">You're receiving this because you're subscribed to daily pop culture news updates.</p>
          <p style="margin: 5px 0 0 0;">Manage your preferences in the app settings.</p>
        </div>
      </div>
    </body>
    </html>
  `;
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
      source: true,
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
    console.log('Starting daily email summary...');
    
    // Get active email recipients
    const recipients = await prisma.emailRecipient.findMany({
      where: { active: true }
    });
    
    if (recipients.length === 0) {
      console.log('No active email recipients found');
      return;
    }
    
    // Get top articles
    const articles = await getTopArticlesForEmail(10);
    
    if (articles.length === 0) {
      console.log('No articles found for email');
      return;
    }
    
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const emailHTML = generateEmailHTML(articles, appUrl);
    const transporter = createEmailTransporter();
    
    const fromEmail = process.env.SENDGRID_FROM || process.env.SMTP_FROM || process.env.SMTP_USER;
    
    // Send email to each recipient
    for (const recipient of recipients) {
      try {
        await transporter.sendMail({
          from: fromEmail,
          to: recipient.email,
          subject: `📰 Your Daily Pop Culture News - ${new Date().toLocaleDateString()}`,
          html: emailHTML,
        });
        
        console.log(`Email sent to ${recipient.email}`);
      } catch (error) {
        console.error(`Error sending email to ${recipient.email}:`, error);
      }
    }
    
    console.log('Daily email summary completed');
  } catch (error) {
    console.error('Error in sendDailyEmailSummary:', error);
    throw error;
  }
}

// Test email function
export async function sendTestEmail(recipientEmail: string) {
  try {
    const articles = await getTopArticlesForEmail(3);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const emailHTML = generateEmailHTML(articles, appUrl);
    const transporter = createEmailTransporter();
    
    const fromEmail = process.env.SENDGRID_FROM || process.env.SMTP_FROM || process.env.SMTP_USER;
    
    await transporter.sendMail({
      from: fromEmail,
      to: recipientEmail,
      subject: '🧪 Test Email - Pop Culture News App',
      html: emailHTML,
    });
    
    return { success: true, message: 'Test email sent successfully' };
  } catch (error: any) {
    console.error('Error sending test email:', error);
    return { success: false, message: error.message };
  }
}
