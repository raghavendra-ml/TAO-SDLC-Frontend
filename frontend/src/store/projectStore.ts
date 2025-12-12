import { create } from 'zustand'
import { Project, Phase } from '../types'

interface ProjectState {
  projects: Project[]
  currentProject: Project | null
  phases: Phase[]
  setProjects: (projects: Project[]) => void
  setCurrentProject: (project: Project | null) => void
  setPhases: (phases: Phase[]) => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  currentProject: null,
  phases: [],
  setProjects: (projects) => set({ projects }),
  setCurrentProject: (project) => set({ currentProject: project }),
  setPhases: (phases) => set({ phases }),
}))

