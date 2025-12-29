// app/api/admin/users/[userId]/attendance/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // adjust if your auth path differs
import prisma from "@/lib/prisma";

export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });

    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const targetUserId = Number(params?.userId);
    if (!targetUserId || Number.isNaN(targetUserId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const learner = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    if (!learner) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get all attendance records for this learner
    const attendanceRecords = await prisma.sessionParticipant.findMany({
      where: {
        userId: targetUserId,
        session: {
          status: { in: ["completed", "scheduled"] },
        },
      },
      include: {
        session: {
          select: {
            id: true,
            title: true,
            startAt: true,
            endAt: true,
            status: true,
            type: true,
            teacher: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { session: { startAt: "desc" } },
    });

    const nonCanceled = attendanceRecords.filter(
      (r) => r.status !== "canceled"
    );

    const stats = {
      totalSessions: nonCanceled.length,
      attended: nonCanceled.filter((r) => r.status === "attended").length,
      noShow: nonCanceled.filter((r) => r.status === "no_show").length,
      excused: nonCanceled.filter((r) => r.status === "excused").length,
      upcoming: nonCanceled.filter(
        (r) =>
          r.status === "booked" &&
          r.session?.startAt &&
          new Date(r.session.startAt) > new Date()
      ).length,
      canceled: attendanceRecords.filter((r) => r.status === "canceled").length,
    };

    const gradedSessions = stats.attended + stats.noShow + stats.excused;
    stats.attendanceRate =
      gradedSessions > 0
        ? Math.round(((stats.attended + stats.excused) / gradedSessions) * 100)
        : null;

    const history = attendanceRecords.map((r) => ({
      id: r.id,
      sessionId: r.session?.id,
      sessionTitle: r.session?.title || "Session",
      sessionDate: r.session?.startAt,
      sessionEndDate: r.session?.endAt,
      sessionStatus: r.session?.status,
      sessionType: r.session?.type,
      teacherName:
        r.session?.teacher?.name || r.session?.teacher?.email || "Unassigned",
      teacherId: r.session?.teacher?.id,
      status: r.status,
      attendedAt: r.attendedAt,
    }));

    // Monthly breakdown (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyData = {};
    nonCanceled
      .filter(
        (r) => r.session?.startAt && new Date(r.session.startAt) >= sixMonthsAgo
      )
      .forEach((r) => {
        const month = new Date(r.session.startAt).toISOString().slice(0, 7); // YYYY-MM
        if (!monthlyData[month]) {
          monthlyData[month] = { total: 0, attended: 0, noShow: 0, excused: 0 };
        }
        monthlyData[month].total++;
        if (r.status === "attended") monthlyData[month].attended++;
        if (r.status === "no_show") monthlyData[month].noShow++;
        if (r.status === "excused") monthlyData[month].excused++;
      });

    const monthlyBreakdown = Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        ...data,
        attendanceRate:
          data.attended + data.noShow + data.excused > 0
            ? Math.round(
                ((data.attended + data.excused) /
                  (data.attended + data.noShow + data.excused)) *
                  100
              )
            : null,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return NextResponse.json({
      learner: {
        id: learner.id,
        name: learner.name,
        email: learner.email,
        memberSince: learner.createdAt,
      },
      stats,
      history,
      monthlyBreakdown,
    });
  } catch (err) {
    console.error("Learner attendance API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch attendance data" },
      { status: 500 }
    );
  }
}
