const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const brief = await runCodeNode(path.join(root, 'sync/n8n-build/image-pipeline-brief.generated.js'), {
    imageGenerationJob: {
      id: 'job_001',
      job_type: 'product_hero',
      fragrance_product_id: 'fragrance_001'
    },
    fragranceProduct: {
      id: 'fragrance_001',
      brand_name: 'Dior',
      name_en: 'Sauvage',
      name_ar: 'سوفاج',
      concentration: 'EDP',
      size_ml: 100
    },
    productMediaRows: [
      {
        id: 10,
        source: 'generated',
        original_url: 'https://cdn.example.test/generated.png'
      },
      {
        id: 3,
        source: 'supplier',
        position: 2,
        original_url: 'https://cdn.example.test/supplier-bottle.png'
      }
    ]
  });

  assertEqual(brief.higgsfieldRequest.model, 'nano_banana_pro', 'brief model');
  assertEqual(brief.higgsfieldRequest.count, 4, 'brief count');
  assertEqual(brief.higgsfieldRequest.reference_images[0].source, 'product_media', 'reference source');
  assertEqual(brief.higgsfieldRequest.reference_images[0].source_row_id, 3, 'reference row id');
  assertIncludes(brief.higgsfieldRequest.prompt, 'Warm Light Luxury', 'positive prompt identity');
  assertIncludes(brief.higgsfieldRequest.prompt, 'never use a dark', 'positive prompt dark ban');
  assertIncludes(brief.higgsfieldRequest.negative_prompt, 'dark background', 'negative prompt dark ban');
  assertEqual(brief.skipImageGeneration, false, 'reference should allow generation');

  const missingRef = await runCodeNode(path.join(root, 'sync/n8n-build/image-pipeline-brief.generated.js'), {
    imageGenerationJob: { id: 'job_002' },
    fragranceProduct: { brand_name: 'Dior', name_en: 'Sauvage' },
    productMediaRows: []
  });
  assertEqual(missingRef.skipImageGeneration, true, 'missing supplier reference guard');
  assertEqual(missingRef.imagePipelineStatus, 'needs_supplier_reference_image', 'missing reference status');

  const quality = await runCodeNode(path.join(root, 'sync/n8n-build/image-pipeline-quality.generated.js'), {
    brief: brief.brief,
    higgsfieldRequest: brief.higgsfieldRequest,
    imageGenerationJob: { id: 'job_001', retry_count: 0, fragrance_product_id: 'fragrance_001' },
    higgsfieldResponse: {
      images: [
        { url: 'https://cdn.example.test/too-small.png', width: 900, height: 900, status: 'succeeded' },
        { url: 'https://cdn.example.test/wrong-aspect.png', width: 2048, height: 1152, status: 'succeeded' },
        { url: 'https://cdn.example.test/failed.png', width: 2048, height: 2048, status: 'failed' },
        { url: 'https://cdn.example.test/best.png', width: 2048, height: 2048, status: 'succeeded' }
      ]
    }
  });

  assertEqual(quality.nextImageAction, 'publish', 'quality action');
  assertEqual(quality.imageGenerationJobPatch.quality_status, 'passed', 'job quality status');
  assertEqual(quality.imageGenerationJobPatch.best_image_url, 'https://cdn.example.test/best.png', 'best image url');
  assertEqual(quality.generatedAssetsRows.length, 4, 'generated assets count');
  assertEqual(quality.generatedAssetsRows.filter((row) => row.is_selected).length, 1, 'one selected asset');
  assertEqual(quality.generatedAssetsRows.find((row) => row.original_url.endsWith('/failed.png')).quality_status, 'rejected', 'failed image rejected');

  console.log(JSON.stringify({
    fixtures: 3,
    warm_light_request: 'passed',
    quality_best_of_4: 'passed',
    best_image_url: quality.imageGenerationJobPatch.best_image_url,
    generated_assets_rows: quality.generatedAssetsRows.length
  }, null, 2));
}

async function runCodeNode(file, json) {
  const source = fs
    .readFileSync(file, 'utf8')
    .replace(/\nawait main\(\);\s*$/, '\nreturn await main();\n');
  const AsyncFn = Object.getPrototypeOf(async function () {}).constructor;
  const fn = new AsyncFn('$json', source);
  const result = await fn(json);
  if (!result || typeof result !== 'object' || !result.json) {
    throw new Error(path.basename(file) + ' did not return an n8n item');
  }
  return result.json;
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(label + ': expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
  }
}

function assertIncludes(value, expected, label) {
  if (!String(value || '').includes(expected)) {
    throw new Error(label + ': missing ' + JSON.stringify(expected));
  }
}
