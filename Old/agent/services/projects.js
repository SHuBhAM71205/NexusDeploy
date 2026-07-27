import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'projects.json');

export const getProjects = () => {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify([]), 'utf8');
  }
  try {
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
};

export const saveProject = (project) => {
  const projects = getProjects();
  const newProject = {
    id: project.id || Date.now().toString(),
    name: project.name,
    platform: project.platform,
    backendUrl: project.backendUrl,
    backendId: project.backendId,
    frontendUrl: project.frontendUrl,
    frontendId: project.frontendId,
    ownerId: project.ownerId,
    timestamp: new Date().toISOString()
  };
  projects.push(newProject);
  fs.writeFileSync(dbPath, JSON.stringify(projects, null, 2), 'utf8');
  return newProject;
};

export const deleteProject = (id) => {
  let projects = getProjects();
  projects = projects.filter(p => p.id !== id);
  fs.writeFileSync(dbPath, JSON.stringify(projects, null, 2), 'utf8');
  return true;
};
