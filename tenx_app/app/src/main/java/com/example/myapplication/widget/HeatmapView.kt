package com.example.myapplication.widget

import android.content.Context
import android.graphics.Canvas
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Shader
import android.util.AttributeSet
import android.view.MotionEvent
import android.view.View
import androidx.core.content.ContextCompat
import com.example.myapplication.R
import java.util.*

class HeatmapView @JvmOverloads constructor(
    context: Context, attrs: AttributeSet? = null, defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    var onDateClickListener: ((String) -> Unit)? = null
    
    private val data = mutableMapOf<String, Int>()
    
    private var currentYear = -1
    private var currentMonth = -1 // 0-based

    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val arrowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 4f
        strokeCap = Paint.Cap.ROUND
        strokeJoin = Paint.Join.ROUND
    }
    private val todayBorderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 3f
        color = ContextCompat.getColor(context, R.color.accent_primary)
    }
    
    // Pixel values
    private var cellSize = 22f
    private var cellPadding = 6f
    private val colLabelHeight = 40f
    private val rowLabelWidth = 60f
    private val headerHeight = 60f
    private val legendHeight = 40f
    
    private val daysOfWeek = arrayOf("Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat")
    
    // Colors — Red gradient matching web's --heatmap-0 through --heatmap-5
    private val colorL0 = ContextCompat.getColor(context, R.color.heatmap_0)
    private val colorL1 = ContextCompat.getColor(context, R.color.heatmap_1)
    private val colorL2 = ContextCompat.getColor(context, R.color.heatmap_2)
    private val colorL3 = ContextCompat.getColor(context, R.color.heatmap_3)
    private val colorL4 = ContextCompat.getColor(context, R.color.heatmap_4)
    private val colorL5 = ContextCompat.getColor(context, R.color.heatmap_5)
    
    private val colorText = ContextCompat.getColor(context, R.color.text_primary)
    private val colorMuted = ContextCompat.getColor(context, R.color.text_muted)
    private val colorCellText = ContextCompat.getColor(context, R.color.text_secondary)
    private val colorAccent = ContextCompat.getColor(context, R.color.accent_primary)

    private val leftArrowRect = RectF()
    private val rightArrowRect = RectF()
    
    // Today's date string for highlighting
    private val todayStr: String

    init {
        val cal = Calendar.getInstance()
        currentYear = cal.get(Calendar.YEAR)
        currentMonth = cal.get(Calendar.MONTH)
        todayStr = String.format(Locale.getDefault(), "%04d-%02d-%02d", 
            cal.get(Calendar.YEAR), cal.get(Calendar.MONTH) + 1, cal.get(Calendar.DAY_OF_MONTH))
    }

    // Overload for old code passing list of days, just grab data map
    fun setData(newData: Map<String, Int>, lastNDays: List<String>) {
        data.clear()
        data.putAll(newData)
        requestLayout()
        invalidate()
    }
    
    fun setData(newData: Map<String, Int>) {
        data.clear()
        data.putAll(newData)
        requestLayout()
        invalidate()
    }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val widthMode = MeasureSpec.getMode(widthMeasureSpec)
        val widthSize = MeasureSpec.getSize(widthMeasureSpec)
        
        var w = widthSize
        if (widthMode == MeasureSpec.UNSPECIFIED || w == 0) {
            w = context.resources.displayMetrics.widthPixels - 64
        }
        
        val availableWidth = w - rowLabelWidth - paddingLeft - paddingRight
        val totalCellSpace = availableWidth / 7f
        cellPadding = totalCellSpace * 0.15f
        cellSize = totalCellSpace * 0.85f

        val desiredHeight = (headerHeight + colLabelHeight + 6 * (cellSize + cellPadding) + legendHeight + paddingTop + paddingBottom).toInt()
        
        setMeasuredDimension(w, resolveSize(desiredHeight, heightMeasureSpec))
    }

    private val cellRects = mutableMapOf<String, RectF>()

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        cellRects.clear()
        
        val width = width.toFloat()
        
        // --- Header (Month + Arrows) ---
        val monthName = getMonthName(currentMonth) + " " + currentYear
        textPaint.color = colorText
        textPaint.textSize = 26f
        textPaint.textAlign = Paint.Align.CENTER
        textPaint.isFakeBoldText = true
        
        val headerY = headerHeight / 2f + 10f
        canvas.drawText(monthName, width / 2f, headerY, textPaint)
        textPaint.isFakeBoldText = false
        
        // Draw Arrows with accent color
        arrowPaint.color = colorAccent
        val cxLeft = width / 2f - 120f
        val cy = headerHeight / 2f
        canvas.drawLine(cxLeft + 10f, cy - 10f, cxLeft - 5f, cy, arrowPaint)
        canvas.drawLine(cxLeft - 5f, cy, cxLeft + 10f, cy + 10f, arrowPaint)
        leftArrowRect.set(cxLeft - 30f, cy - 30f, cxLeft + 30f, cy + 30f)
        
        val cxRight = width / 2f + 120f
        canvas.drawLine(cxRight - 10f, cy - 10f, cxRight + 5f, cy, arrowPaint)
        canvas.drawLine(cxRight + 5f, cy, cxRight - 10f, cy + 10f, arrowPaint)
        rightArrowRect.set(cxRight - 30f, cy - 30f, cxRight + 30f, cy + 30f)
        
        // --- Grid ---
        val startY = headerHeight + colLabelHeight + paddingTop
        val startX = rowLabelWidth + paddingLeft
        
        textPaint.color = colorMuted
        val dynamicFontSize = Math.max(12f, cellSize * 0.45f)
        textPaint.textSize = dynamicFontSize
        textPaint.textAlign = Paint.Align.CENTER
        
        // Col Labels (Days of Week)
        for (col in 0..6) {
            val cx = startX + col * (cellSize + cellPadding) + cellSize / 2f
            canvas.drawText(daysOfWeek[col].substring(0, 1), cx, headerHeight + paddingTop + colLabelHeight / 2f + 10f, textPaint)
        }
        
        val cal = Calendar.getInstance()
        cal.set(currentYear, currentMonth, 1)
        val firstDayOfWeek = cal.get(Calendar.DAY_OF_WEEK) - 1 // 0 = Sun
        val daysInMonth = cal.getActualMaximum(Calendar.DAY_OF_MONTH)
        
        val cellTextSize = Math.max(10f, cellSize * 0.35f)
        textPaint.textSize = cellTextSize
        
        var dayOfMonth = 1
        var row = 0
        while (dayOfMonth <= daysInMonth && row < 6) {
            // Row Label (W1, W2, ...)
            textPaint.color = colorMuted
            textPaint.textAlign = Paint.Align.RIGHT
            textPaint.textSize = dynamicFontSize
            val rowY = startY + row * (cellSize + cellPadding) + cellSize / 2f + (dynamicFontSize / 3f)
            canvas.drawText("W${row + 1}", startX - 15f, rowY, textPaint)
            
            for (col in 0..6) {
                if (row == 0 && col < firstDayOfWeek) continue
                if (dayOfMonth > daysInMonth) break
                
                val dateStr = String.format(Locale.getDefault(), "%04d-%02d-%02d", currentYear, currentMonth + 1, dayOfMonth)
                val count = data[dateStr] ?: 0
                
                paint.color = when {
                    count == 0 -> colorL0
                    count <= 2 -> colorL1
                    count <= 5 -> colorL2
                    count <= 8 -> colorL3
                    count <= 12 -> colorL4
                    else -> colorL5
                }
                
                val left = startX + col * (cellSize + cellPadding)
                val top = startY + row * (cellSize + cellPadding)
                val cornerRadius = cellSize * 0.2f
                
                cellRects[dateStr] = RectF(left, top, left + cellSize, top + cellSize)
                canvas.drawRoundRect(left, top, left + cellSize, top + cellSize, cornerRadius, cornerRadius, paint)
                
                // Highlight today with accent border
                if (dateStr == todayStr) {
                    canvas.drawRoundRect(left, top, left + cellSize, top + cellSize, cornerRadius, cornerRadius, todayBorderPaint)
                }
                
                // Draw day number text on top of none or low color
                textPaint.color = if (count >= 3) 0xFFFFFFFF.toInt() else colorCellText
                textPaint.textAlign = Paint.Align.CENTER
                textPaint.textSize = cellTextSize
                canvas.drawText(dayOfMonth.toString(), left + cellSize / 2f, top + cellSize / 2f + (cellTextSize / 3f), textPaint)
                
                dayOfMonth++
            }
            row++
        }
        
        // --- Legend ---
        val legendY = startY + row * (cellSize + cellPadding) + 10f
        val legendCellSize = cellSize * 0.5f
        val legendPad = 6f
        val legendColors = intArrayOf(colorL0, colorL1, colorL2, colorL3, colorL4, colorL5)
        
        textPaint.color = colorMuted
        textPaint.textSize = 12f
        textPaint.textAlign = Paint.Align.RIGHT
        canvas.drawText("Less", width / 2f - (legendColors.size / 2f) * (legendCellSize + legendPad) - 10f, legendY + legendCellSize / 2f + 5f, textPaint)
        
        val legendStartX = width / 2f - (legendColors.size / 2f) * (legendCellSize + legendPad)
        for (i in legendColors.indices) {
            paint.color = legendColors[i]
            val lx = legendStartX + i * (legendCellSize + legendPad)
            canvas.drawRoundRect(lx, legendY, lx + legendCellSize, legendY + legendCellSize, 4f, 4f, paint)
        }
        
        textPaint.textAlign = Paint.Align.LEFT
        canvas.drawText("More", legendStartX + legendColors.size * (legendCellSize + legendPad) + 6f, legendY + legendCellSize / 2f + 5f, textPaint)
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        if (event.action == MotionEvent.ACTION_DOWN) {
            if (leftArrowRect.contains(event.x, event.y)) {
                currentMonth--
                if (currentMonth < 0) {
                    currentMonth = 11
                    currentYear--
                }
                invalidate()
                return true
            }
            if (rightArrowRect.contains(event.x, event.y)) {
                currentMonth++
                if (currentMonth > 11) {
                    currentMonth = 0
                    currentYear++
                }
                invalidate()
                return true
            }
            for ((dateStr, rect) in cellRects) {
                if (rect.contains(event.x, event.y)) {
                    onDateClickListener?.invoke(dateStr)
                    return true
                }
            }
        }
        return super.onTouchEvent(event)
    }

    private fun getMonthName(m: Int) = arrayOf(
        "January", "February", "March", "April", "May", "June", 
        "July", "August", "September", "October", "November", "December"
    ).getOrElse(m) { "" }
}
