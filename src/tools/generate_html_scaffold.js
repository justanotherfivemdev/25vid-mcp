// =========================
// MCP Tool: generate_html_scaffold
// =========================
// Generates HTML boilerplate and scaffold templates for
// web development projects — community web building tool.

module.exports = {
  name: "generate_html_scaffold",
  description:
    "Generate an HTML scaffold/boilerplate for web projects. Supports landing pages, dashboards, and component templates. Useful for website building and rapid prototyping.",
  inputSchema: {
    type: "object",
    properties: {
      template: {
        type: "string",
        description: "Template type: 'landing', 'dashboard', 'form', 'component' (default: landing)",
      },
      title: {
        type: "string",
        description: "Page title (default: 'My Project')",
      },
      dark_mode: {
        type: "boolean",
        description: "Include dark mode CSS (default: true)",
      },
    },
  },
  scope: "public",
  handler: async (args) => {
    const title = args.title || "My Project";
    const darkMode = args.dark_mode !== false;
    const template = (args.template || "landing").toLowerCase();

    const templates = {
      landing: generateLanding(title, darkMode),
      dashboard: generateDashboard(title, darkMode),
      form: generateForm(title, darkMode),
      component: generateComponent(title, darkMode),
    };

    const result = templates[template];
    if (!result) {
      return JSON.stringify({
        error: "Unknown template: " + template,
        available: Object.keys(templates),
      });
    }

    return result;
  },
};

function baseStyles(darkMode) {
  if (!darkMode) {
    return `    :root { --bg: #ffffff; --surface: #f8f9fa; --text: #212529; --accent: #0d6efd; --border: #dee2e6; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: var(--bg); color: var(--text); }`;
  }
  return `    :root { --bg: #0f172a; --surface: #1e293b; --text: #e2e8f0; --accent: #38bdf8; --border: #334155; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: var(--bg); color: var(--text); }`;
}

function generateLanding(title, darkMode) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
${baseStyles(darkMode)}
    .hero { text-align: center; padding: 80px 20px; }
    .hero h1 { font-size: 48px; margin-bottom: 16px; color: var(--accent); }
    .hero p { font-size: 18px; max-width: 600px; margin: 0 auto 32px; opacity: 0.8; }
    .btn { display: inline-block; padding: 12px 32px; background: var(--accent); color: var(--bg); border-radius: 8px; text-decoration: none; font-weight: 600; }
    .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px; padding: 40px 24px; max-width: 1200px; margin: 0 auto; }
    .feature { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 24px; }
    .feature h3 { margin-bottom: 8px; color: var(--accent); }
  </style>
</head>
<body>
  <div class="hero">
    <h1>${title}</h1>
    <p>Your project description goes here. Edit this template to build your landing page.</p>
    <a href="#features" class="btn">Get Started</a>
  </div>
  <div class="features" id="features">
    <div class="feature"><h3>Feature One</h3><p>Description of the first feature.</p></div>
    <div class="feature"><h3>Feature Two</h3><p>Description of the second feature.</p></div>
    <div class="feature"><h3>Feature Three</h3><p>Description of the third feature.</p></div>
  </div>
</body>
</html>`;
}

function generateDashboard(title, darkMode) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Dashboard</title>
  <style>
${baseStyles(darkMode)}
    header { background: var(--surface); padding: 16px 24px; border-bottom: 1px solid var(--border); }
    header h1 { font-size: 18px; color: var(--accent); }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; padding: 24px; max-width: 1400px; margin: 0 auto; }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 20px; }
    .card h2 { font-size: 14px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.7; }
    .card .value { font-size: 32px; font-weight: 800; color: var(--accent); }
  </style>
</head>
<body>
  <header><h1>${title}</h1></header>
  <div class="grid">
    <div class="card"><h2>Metric 1</h2><div class="value">0</div></div>
    <div class="card"><h2>Metric 2</h2><div class="value">0</div></div>
    <div class="card"><h2>Metric 3</h2><div class="value">0</div></div>
    <div class="card"><h2>Metric 4</h2><div class="value">0</div></div>
  </div>
</body>
</html>`;
}

function generateForm(title, darkMode) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Form</title>
  <style>
${baseStyles(darkMode)}
    .form-container { max-width: 480px; margin: 60px auto; padding: 32px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; }
    h1 { font-size: 24px; margin-bottom: 24px; color: var(--accent); }
    label { display: block; margin-bottom: 6px; font-size: 14px; font-weight: 600; }
    input, textarea, select { width: 100%; padding: 10px 12px; margin-bottom: 16px; background: var(--bg); border: 1px solid var(--border); border-radius: 6px; color: var(--text); font-size: 14px; }
    button { width: 100%; padding: 12px; background: var(--accent); color: var(--bg); border: none; border-radius: 6px; font-size: 16px; font-weight: 600; cursor: pointer; }
  </style>
</head>
<body>
  <div class="form-container">
    <h1>${title}</h1>
    <form>
      <label for="name">Name</label>
      <input type="text" id="name" name="name" placeholder="Enter your name">
      <label for="email">Email</label>
      <input type="email" id="email" name="email" placeholder="Enter your email">
      <label for="message">Message</label>
      <textarea id="message" name="message" rows="4" placeholder="Your message..."></textarea>
      <button type="submit">Submit</button>
    </form>
  </div>
</body>
</html>`;
}

function generateComponent(title, darkMode) {
  return `<!-- ${title} Component -->
<style>
  .component { background: ${darkMode ? "#1e293b" : "#f8f9fa"}; border: 1px solid ${darkMode ? "#334155" : "#dee2e6"}; border-radius: 8px; padding: 20px; color: ${darkMode ? "#e2e8f0" : "#212529"}; font-family: sans-serif; }
  .component h3 { margin-bottom: 8px; color: ${darkMode ? "#38bdf8" : "#0d6efd"}; }
  .component p { opacity: 0.8; line-height: 1.6; }
</style>
<div class="component">
  <h3>${title}</h3>
  <p>This is a reusable component template. Customize it for your project.</p>
</div>`;
}
