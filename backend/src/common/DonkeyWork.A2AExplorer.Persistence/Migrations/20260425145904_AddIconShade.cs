using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DonkeyWork.A2AExplorer.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddIconShade : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "icon_shade",
                table: "agents",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "icon_shade",
                table: "agents");
        }
    }
}
