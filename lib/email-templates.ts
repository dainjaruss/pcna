// Email templates for Pop Culture News App

interface EmailTemplateOptions {
  articles: EmailArticle[];
  appUrl: string;
  recipientEmail?: string;
  templateType?: 'daily' | 'weekly' | 'breaking';
  unsubscribeUrl?: string;
}

/**
 * Generate a professional HTML email template
 */
export function generateEmailTemplate(options: EmailTemplateOptions): string {
  const { articles, appUrl, templateType = 'daily', unsubscribeUrl } = options;

  const templateConfig = getTemplateConfig(templateType);
  const articlesHTML = articles.map((article, index) => 
    generateArticleCard(article, index)
  ).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${templateConfig.title}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; -webkit-font-smoothing: antialiased;">
  <!-- Preheader text (hidden preview text) -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${templateConfig.preheader}
  </div>
  
  <!-- Email wrapper -->
  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f8fafc;">
    <tr>
      <td style="padding: 40px 20px;">
        <!-- Main container -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 50%, #ec4899 100%); padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                📰 Pop Culture News
              </h1>
              <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
                ${templateConfig.subtitle}
              </p>
            </td>
          </tr>
          
          <!-- Intro section -->
          <tr>
            <td style="padding: 32px 24px 16px 24px;">
              <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6;">
                ${templateConfig.intro}
              </p>
            </td>
          </tr>
          
          <!-- Articles section -->
          <tr>
            <td style="padding: 0 24px;">
              ${articlesHTML}
            </td>
          </tr>
          
          <!-- CTA section -->
          <tr>
            <td style="padding: 32px 24px; text-align: center;">
              <a href="${appUrl}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px 0 rgba(139, 92, 246, 0.39);">
                View All Stories →
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px; border-top: 1px solid #e5e7eb;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
                <tr>
                  <td style="text-align: center; padding-bottom: 16px;">
                    <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
                      You&apos;re receiving this because you subscribed to daily updates.
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                      ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center;">
                    <a href="${appUrl}/settings" style="color: #6b7280; font-size: 12px; text-decoration: underline;">
                      Manage Preferences
                    </a>
                    ${unsubscribeUrl ? ` | <a href="${unsubscribeUrl}" style="color: #6b7280; font-size: 12px; text-decoration: underline;">Unsubscribe</a>` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function getTemplateConfig(type: 'daily' | 'weekly' | 'breaking') {
  const configs = {
    daily: {
      title: 'Your Daily Pop Culture News',
      subtitle: 'Your daily dose of celebrity news',
      preheader: "Here's what's trending in pop culture today!",
      intro: "Good morning! Here are today's top stories from the world of entertainment and celebrity news, curated just for you.",
    },
    weekly: {
      title: 'Your Weekly Pop Culture Digest',
      subtitle: 'This week in entertainment',
      preheader: "Here's your weekly entertainment roundup!",
      intro: "Here's a recap of the biggest stories from the past week. Don't miss out on what everyone's talking about!",
    },
    breaking: {
      title: '🚨 Breaking News',
      subtitle: 'Just in!',
      preheader: 'Breaking entertainment news you need to know!',
      intro: "We've got breaking news from the entertainment world. Here's what you need to know:",
    },
  };
  
  return configs[type];
}

function generateArticleCard(article: EmailArticle, index: number): string {
  const credibilityColor = article.credibilityRating >= 7 ? '#10b981' : 
                           article.credibilityRating >= 5 ? '#f59e0b' : '#ef4444';
  
  const credibilityLabel = article.credibilityRating >= 7 ? 'High Credibility' :
                           article.credibilityRating >= 5 ? 'Moderate' : 'Low Credibility';
  
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 24px; ${index !== 0 ? 'border-top: 1px solid #e5e7eb; padding-top: 24px;' : ''}">
      <tr>
        <td>
          ${article.imageUrl ? `
            <a href="${article.url}" style="text-decoration: none;">
              <img src="${article.imageUrl}" alt="${article.title}" style="width: 100%; height: auto; border-radius: 12px; margin-bottom: 16px; display: block;" />
            </a>
          ` : ''}
          
          <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 600; line-height: 1.4;">
            <a href="${article.url}" style="color: #111827; text-decoration: none;">
              ${article.title}
            </a>
          </h2>
          
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
            <tr>
              <td style="padding-right: 16px;">
                <span style="display: inline-block; padding: 4px 10px; background-color: #f3f4f6; border-radius: 4px; font-size: 12px; color: #6b7280;">
                  ${article.source.name}
                </span>
              </td>
              <td>
                <span style="display: inline-block; padding: 4px 10px; background-color: ${credibilityColor}1a; border-radius: 4px; font-size: 12px; color: ${credibilityColor};">
                  ★ ${article.credibilityRating}/10 · ${credibilityLabel}
                </span>
              </td>
            </tr>
          </table>
          
          <p style="margin: 0 0 16px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
            ${article.summary}
          </p>
          
          <a href="${article.url}" style="display: inline-block; color: #8b5cf6; font-size: 14px; font-weight: 500; text-decoration: none;">
            Read full story →
          </a>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Generate a plain text version of the email
 */
export function generateEmailPlainText(options: EmailTemplateOptions): string {
  const { articles, appUrl, templateType = 'daily' } = options;
  
  const templateConfig = getTemplateConfig(templateType);
  
  let text = `
${templateConfig.title}
${'='.repeat(templateConfig.title.length)}

${templateConfig.intro}

`;

  articles.forEach((article, index) => {
    text += `
${index + 1}. ${article.title}
   Source: ${article.source.name} | Credibility: ${article.credibilityRating}/10
   ${article.summary}
   Read more: ${article.url}

`;
  });

  text += `
---
View all stories: ${appUrl}
Manage preferences: ${appUrl}/settings

You're receiving this because you subscribed to ${templateType} updates from Pop Culture News.
`;

  return text.trim();
}

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
