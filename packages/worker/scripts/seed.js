import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const BUCKET_NAME = 'my-bucket'; // Actual R2 bucket name (must use hyphens)
const BUCKET_BINDING = 'my_bucket'; // Binding name used in code (matches wrangler.toml)
const DATABASE_NAME = 'r2e2-db';
const ASSETS_DIR = path.join(process.cwd(), 'seed_assets');

function run(cmd) {
  console.log(`> ${cmd}`);
  try {
    return execSync(cmd, { stdio: 'inherit' });
  } catch (e) {
    console.error(`Command failed: ${cmd}`);
    process.exit(1);
  }
}

async function seed() {
  console.log('🚀 Starting local seed process...');

  // 1. Ensure wrangler.toml exists
  if (!fs.existsSync('wrangler.toml')) {
    console.log('📝 Creating wrangler.toml from example...');
    fs.copyFileSync('wrangler.toml.example', 'wrangler.toml');
  }

  // 2. Initialize D1 Schema
  console.log('🗄️ Initializing local D1 database...');
  run(`npx wrangler d1 execute ${DATABASE_NAME} --local --file=src/modules/db/schema.sql`);

  // 3. Clear existing local data (optional but cleaner for seed)
  console.log('🧹 Clearing old local data...');
  run(`npx wrangler d1 execute ${DATABASE_NAME} --local --command="DELETE FROM media; DELETE FROM tags; DELETE FROM media_tags; DELETE FROM ai_usage;"`);

  // 4. Seed R2 Bucket
  const files = [
    { name: 'beach.png', key: 'photos/beach.png', type: 'image/png' },
    { name: 'city.png', key: 'photos/city.png', type: 'image/png' },
    { name: 'sample.txt', key: 'docs/test.txt', type: 'text/plain' },
  ];

  console.log('📦 Seeding local R2 bucket...');
  for (const file of files) {
    const filePath = path.join(ASSETS_DIR, file.name);
    if (fs.existsSync(filePath)) {
      run(`npx wrangler r2 object put ${BUCKET_NAME}/${file.key} --local --file="${filePath}"`);
    } else {
      console.warn(`⚠️ Warning: Seed asset ${file.name} not found, skipping.`);
    }
  }

  // 5. Seed D1 Media & Tags
  console.log('📝 Populating D1 with mock records...');
  
  // Insert Tags
  run(`npx wrangler d1 execute ${DATABASE_NAME} --local --command="INSERT INTO tags (name, slug, usage_count) VALUES ('Nature', 'nature', 1), ('Urban', 'urban', 1), ('Document', 'document', 1);"`);

  // Insert Media
  run(`npx wrangler d1 execute ${DATABASE_NAME} --local --command="INSERT INTO media (bucket, key, title, description, content_type, size, uploaded_at) VALUES ('${BUCKET_BINDING}', 'photos/beach.png', 'Tropical Beach', 'A beautiful beach with palm trees.', 'image/png', 102400, datetime('now'));"`);
  run(`npx wrangler d1 execute ${DATABASE_NAME} --local --command="INSERT INTO media (bucket, key, title, description, content_type, size, uploaded_at) VALUES ('${BUCKET_BINDING}', 'photos/city.png', 'Neon City', 'Cyberpunk style city skyline.', 'image/png', 204800, datetime('now'));"`);
  run(`npx wrangler d1 execute ${DATABASE_NAME} --local --command="INSERT INTO media (bucket, key, title, description, content_type, size, uploaded_at) VALUES ('${BUCKET_BINDING}', 'docs/test.txt', 'Sample Doc', 'Testing the text previewer.', 'text/plain', 512, datetime('now'));"`);

  // Link Media to Tags
  run(`npx wrangler d1 execute ${DATABASE_NAME} --local --command="INSERT INTO media_tags (media_id, tag_id) SELECT m.id, t.id FROM media m, tags t WHERE m.key = 'photos/beach.png' AND t.slug = 'nature';"`);
  run(`npx wrangler d1 execute ${DATABASE_NAME} --local --command="INSERT INTO media_tags (media_id, tag_id) SELECT m.id, t.id FROM media m, tags t WHERE m.key = 'photos/city.png' AND t.slug = 'urban';"`);
  run(`npx wrangler d1 execute ${DATABASE_NAME} --local --command="INSERT INTO media_tags (media_id, tag_id) SELECT m.id, t.id FROM media m, tags t WHERE m.key = 'docs/test.txt' AND t.slug = 'document';"`);

  console.log('\n✅ Local environment seeded successfully!');
  console.log('👉 Run "npx wrangler dev" to start the worker.');
  console.log('👉 Run "pnpm --filter r2-e2-dashboard dev" to start the UI.');
}

seed().catch(console.error);
