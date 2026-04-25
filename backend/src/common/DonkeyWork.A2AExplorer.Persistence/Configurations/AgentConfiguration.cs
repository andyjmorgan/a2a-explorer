// <copyright file="AgentConfiguration.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using DonkeyWork.A2AExplorer.Persistence.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DonkeyWork.A2AExplorer.Persistence.Configurations;

/// <summary>EF Core schema configuration for <see cref="AgentEntity"/>.</summary>
public sealed class AgentConfiguration : IEntityTypeConfiguration<AgentEntity>
{
    /// <inheritdoc />
    public void Configure(EntityTypeBuilder<AgentEntity> builder)
    {
        builder.ToTable("agents");
        builder.HasKey(a => a.Id);

        builder.Property(a => a.Id).HasColumnName("id");
        builder.Property(a => a.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(a => a.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(a => a.UpdatedAt).HasColumnName("updated_at");
        builder.Property(a => a.Name).HasColumnName("name").IsRequired().HasMaxLength(255);
        builder.Property(a => a.BaseUrl).HasColumnName("base_url").IsRequired().HasMaxLength(2048);
        builder.Property(a => a.AuthMode).HasColumnName("auth_mode").HasConversion<int>().IsRequired();
        builder.Property(a => a.AuthHeaderName).HasColumnName("auth_header_name").HasMaxLength(128);
        builder.Property(a => a.AuthHeaderValueEncrypted).HasColumnName("auth_header_value_encrypted");
        builder.Property(a => a.LastUsedAt).HasColumnName("last_used_at");

        builder.HasIndex(a => a.UserId).HasDatabaseName("ix_agents_user_id");
        builder.HasIndex(a => new { a.UserId, a.Name })
            .HasDatabaseName("ux_agents_user_id_name")
            .IsUnique();
    }
}
