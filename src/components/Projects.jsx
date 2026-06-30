import { projects } from '../data/content';
import ProjectCard from '../motion/ProjectCard';
import SectionHeader from '../motion/SectionHeader';

export default function Projects() {
  return (
    <section id="projects" className="section">
      <SectionHeader label="Projects" title="Things I have built." />
      <ul className="card-grid">
        {projects.map((project, i) => (
          <ProjectCard key={project.title} project={project} index={i} />
        ))}
      </ul>
    </section>
  );
}
