# Stage 1 — build the React SPA
FROM node:22-alpine AS web
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /src
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts index.html ./
COPY public ./public
COPY src ./src
RUN pnpm build

# Stage 2 — publish the .NET backend
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS api
WORKDIR /src
COPY backend/Directory.Build.props backend/stylecop.json backend/.editorconfig ./backend/
COPY backend/src ./backend/src
WORKDIR /src/backend
RUN dotnet publish src/DonkeyWork.A2AExplorer.Api -c Release -o /publish

# Stage 3 — minimal runtime: aspnet + the SPA in wwwroot
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=api /publish ./
COPY --from=web /src/dist ./wwwroot
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080
ENTRYPOINT ["dotnet", "DonkeyWork.A2AExplorer.Api.dll"]
