import { createContext, useContext, useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { api } from './api';
import type { Project } from './types';
import Layout from './components/Layout';
import Overview from './pages/Overview';
import Errors from './pages/Errors';
import ErrorDetail from './pages/ErrorDetail';
import Issues from './pages/Issues';
import IssueDetail from './pages/IssueDetail';
import Tracks from './pages/Tracks';
import Vitals from './pages/Vitals';
import Sourcemaps from './pages/Sourcemaps';
import Settings from './pages/Settings';

interface ProjectContextValue {
  projects: Project[];
  projectId: number | undefined;
  setProjectId: (id: number | undefined) => void;
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue>({
  projects: [],
  projectId: undefined,
  setProjectId: () => undefined,
  refreshProjects: async () => undefined,
});

export function useProject() {
  return useContext(ProjectContext);
}

function AppShell() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<number | undefined>(() => {
    const saved = localStorage.getItem('fm_project_id');
    return saved ? Number(saved) : undefined;
  });

  const refreshProjects = async () => {
    try {
      const list = await api.projects();
      setProjects(list);
      setProjectId((current) => {
        if (current && list.some((p) => p.id === current)) return current;
        return list[0]?.id;
      });
    } catch (_e) {
      setProjects([]);
    }
  };

  useEffect(() => {
    refreshProjects();
  }, []);

  useEffect(() => {
    if (projectId) localStorage.setItem('fm_project_id', String(projectId));
    else localStorage.removeItem('fm_project_id');
  }, [projectId]);

  return (
    <ProjectContext.Provider value={{ projects, projectId, setProjectId, refreshProjects }}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Overview />} />
          <Route path="/errors" element={<Errors />} />
          <Route path="/errors/:id" element={<ErrorDetail />} />
          <Route path="/issues" element={<Issues />} />
          <Route path="/issues/:id" element={<IssueDetail />} />
          <Route path="/tracks" element={<Tracks />} />
          <Route path="/vitals" element={<Vitals />} />
          <Route path="/sourcemaps" element={<Sourcemaps />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ProjectContext.Provider>
  );
}

export default function App() {
  return <AppShell />;
}
