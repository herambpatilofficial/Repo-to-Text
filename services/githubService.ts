
const IGNORED_DIRS = ['node_modules', '.git', '.github', 'dist', 'build', 'vendor', 'public', 'assets'];
const IGNORED_FILES = [
  '.gitignore',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'composer.lock',
];
const IGNORED_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
  '.woff', '.woff2', '.ttf', '.eot',
  '.mp3', '.mp4', '.webm',
  '.zip', '.gz', '.tar', '.rar',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.DS_Store',
];

interface GithubFile {
  path: string;
  type: 'blob' | 'tree';
  url: string;
  sha: string;
  size?: number;
}

interface GithubTree {
  sha: string;
  url: string;
  tree: GithubFile[];
  truncated: boolean;
}

const parseRepoUrl = (url: string): { owner: string; repo: string } => {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname !== 'github.com') {
      throw new Error('Invalid GitHub URL. Hostname must be github.com.');
    }
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    if (pathParts.length < 2) {
      throw new Error('Invalid GitHub repository URL format.');
    }
    const [owner, repo] = pathParts;
    return { owner, repo: repo.replace('.git', '') };
  } catch (error) {
    throw new Error('Invalid URL. Please provide a valid GitHub repository URL.');
  }
};

const buildFileTree = (files: string[]): string => {
  const root: any = {};

  files.forEach(path => {
    const parts = path.split('/');
    let current = root;
    parts.forEach((part) => {
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    });
  });

  const generateTreeString = (node: any, prefix = ''): string => {
    const entries = Object.keys(node);
    let treeString = '';
    entries.forEach((entry, index) => {
      const isLast = index === entries.length - 1;
      treeString += `${prefix}${isLast ? '└── ' : '├── '}${entry}\n`;
      if (Object.keys(node[entry]).length > 0) {
        treeString += generateTreeString(node[entry], `${prefix}${isLast ? '    ' : '│   '}`);
      }
    });
    return treeString;
  };

  return generateTreeString(root);
};


export const fetchRepoContents = async (
  repoUrl: string,
  setLoadingMessage: (message: string) => void
): Promise<{ tree: string; combinedContent: string; fileName: string }> => {
  setLoadingMessage('Parsing repository URL...');
  const { owner, repo } = parseRepoUrl(repoUrl);

  setLoadingMessage(`Fetching main branch for ${owner}/${repo}...`);
  const repoInfo = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
  if (!repoInfo.ok) {
     if (repoInfo.status === 404) throw new Error('Repository not found. Please check the URL.');
     if (repoInfo.status === 403) throw new Error('API rate limit exceeded. Please wait a bit and try again.');
     throw new Error(`Failed to fetch repository info. Status: ${repoInfo.status}`);
  }
  const repoData = await repoInfo.json();
  const defaultBranch = repoData.default_branch;

  setLoadingMessage(`Fetching file tree for branch: ${defaultBranch}...`);
  const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`;
  const treeResponse = await fetch(treeUrl);
   if (!treeResponse.ok) {
     throw new Error(`Failed to fetch file tree. Status: ${treeResponse.status}`);
  }
  const treeData: GithubTree = await treeResponse.json();

  if (treeData.truncated) {
    console.warn('File tree is truncated. Some files may be missing for very large repositories.');
  }

  setLoadingMessage('Filtering files...');
  const filesToFetch = treeData.tree.filter((file: GithubFile) => {
    if (file.type !== 'blob') return false;
    const pathParts = file.path.split('/');
    if (pathParts.some(part => IGNORED_DIRS.includes(part))) return false;
    if (IGNORED_FILES.includes(pathParts[pathParts.length - 1])) return false;
    if (IGNORED_EXTENSIONS.some(ext => file.path.endsWith(ext))) return false;
    return true;
  });

  const fileTreeString = buildFileTree(filesToFetch.map(f => f.path));

  let combinedContent = `GitHub Repository: ${repoUrl}\n\n`;
  combinedContent += `File Structure:\n${fileTreeString}\n\n`;
  combinedContent += '========================================\n\n';

  const totalFiles = filesToFetch.length;
  for (let i = 0; i < totalFiles; i++) {
    const file = filesToFetch[i];
    setLoadingMessage(`Fetching content for ${file.path} (${i + 1}/${totalFiles})...`);

    try {
        const contentResponse = await fetch(file.url);
        if (!contentResponse.ok) {
          console.warn(`Skipping file ${file.path} due to fetch error: ${contentResponse.status}`);
          continue;
        }
        const fileData = await contentResponse.json();
        
        if (fileData.encoding === 'base64') {
          // Check for binary content before decoding
          const decoded = atob(fileData.content);
          // Simple check for non-text characters
          // A more robust check might be necessary for edge cases
          if (/[\x00-\x08\x0E-\x1F]/.test(decoded)) {
             console.warn(`Skipping binary file detected after decoding: ${file.path}`);
             continue;
          }
          combinedContent += `--- FILE: ${file.path} ---\n\n`;
          combinedContent += `${decoded}\n\n`;
          combinedContent += '========================================\n\n';
        } else {
            console.warn(`Skipping file ${file.path} with unhandled encoding: ${fileData.encoding}`);
        }
    } catch (e) {
        console.error(`Error processing file ${file.path}:`, e);
    }
  }

  setLoadingMessage('Bundle created successfully!');
  
  return {
    tree: fileTreeString,
    combinedContent,
    fileName: repo,
  };
};
