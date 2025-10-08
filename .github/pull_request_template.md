# chore(program): ADAF v0.9 en mismo repo (Project, issues, workflows y docs)

## Link al Project
- [Project ADAF v0.9 (8w)](<agregar-url-del-project>)

## Issues por milestone
- M1: ...
- M2: ...
- M3: ...
- M4: ...
- M5: ...

## Cómo correr
```bash
chmod +x scripts/bootstrap-project.sh
./scripts/bootstrap-project.sh
chmod +x scripts/create-issues.sh
./scripts/create-issues.sh
gh workflow run wsp-ci.yml
gh workflow run k6-perf.yml
```
