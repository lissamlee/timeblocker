"use client";
import React, { useState, useCallback, useEffect } from "react";

import { useHandleStreamResponse } from "../utilities/runtime-helpers";

function MainComponent() {
  const [scheduledItems, setScheduledItems] = useState([]);
  const [unscheduledItems, setUnscheduledItems] = useState([]);
  const [blockedTimes, setBlockedTimes] = useState([]);
  const [newBlockStart, setNewBlockStart] = useState("");
  const [newBlockEnd, setNewBlockEnd] = useState("");
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragSource, setDragSource] = useState(null);
  const [droppedIndex, setDroppedIndex] = useState(null);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemDuration, setNewItemDuration] = useState("20");
  const [dayStartTime, setDayStartTime] = useState("09:00");
  const [error, setError] = useState("");
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [swipingItem, setSwipingItem] = useState(null);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [swipeTarget, setSwipeTarget] = useState(null);

  const calculateTime = useCallback(
    (index) => {
      let startMinutes =
        parseInt(dayStartTime.split(":")[0]) * 60 +
        parseInt(dayStartTime.split(":")[1]);
      const taskTimes = [];
      let currentTime = startMinutes;

      for (let i = 0; i <= index; i++) {
        const task = scheduledItems[i];
        let taskStart = currentTime;

        if (task.roundingEnabled && taskStart % 5 !== 0) {
          taskStart = Math.ceil(taskStart / 5) * 5;
        }

        let taskEnd = taskStart + task.duration;

        for (const block of blockedTimes) {
          const blockStart =
            parseInt(block.start.split(":")[0]) * 60 +
            parseInt(block.start.split(":")[1]);
          const blockEnd =
            parseInt(block.end.split(":")[0]) * 60 +
            parseInt(block.end.split(":")[1]);

          if (
            (taskStart >= blockStart && taskStart <= blockEnd) ||
            (taskEnd >= blockStart && taskEnd <= blockEnd) ||
            (taskStart <= blockStart && taskEnd >= blockEnd)
          ) {
            taskStart = blockEnd + 1;
            if (task.roundingEnabled && taskStart % 5 !== 0) {
              taskStart = Math.ceil(taskStart / 5) * 5;
            }
            taskEnd = taskStart + task.duration;
          }
        }

        taskTimes.push({ start: taskStart, end: taskEnd });
        currentTime = taskEnd + 1;
      }

      let followsBlock = false;
      let blockTimeRange = null;
      let gapToPrevious = 0;
      let gapFromBlock = 0;

      for (const block of blockedTimes) {
        const blockEnd =
          parseInt(block.end.split(":")[0]) * 60 +
          parseInt(block.end.split(":")[1]);

        if (taskTimes[index].start > blockEnd) {
          const nextTaskStart = taskTimes[index].start;
          const prevTaskEnd =
            index > 0 ? taskTimes[index - 1].end : startMinutes;

          if (blockEnd >= prevTaskEnd && blockEnd < nextTaskStart) {
            followsBlock = true;
            blockTimeRange = block;
            gapFromBlock = nextTaskStart - blockEnd;
            break;
          }
        }
      }

      if (index > 0) {
        const prevEnd = taskTimes[index - 1].end;
        const currentStart = taskTimes[index].start;

        let hasBlockInBetween = false;
        let relevantBlock = null;

        for (const block of blockedTimes) {
          const blockStart =
            parseInt(block.start.split(":")[0]) * 60 +
            parseInt(block.start.split(":")[1]);
          const blockEnd =
            parseInt(block.end.split(":")[0]) * 60 +
            parseInt(block.end.split(":")[1]);

          if (blockStart > prevEnd && blockEnd < currentStart) {
            hasBlockInBetween = true;
            relevantBlock = block;
            gapToPrevious = blockStart - prevEnd;
            break;
          }
        }

        if (!hasBlockInBetween) {
          gapToPrevious = currentStart - prevEnd;
        }
      }

      const finalStartMinutes = taskTimes[index].start;
      const finalEndMinutes = taskTimes[index].end;

      const startHours = Math.floor(finalStartMinutes / 60);
      const startMins = finalStartMinutes % 60;
      const endHours = Math.floor(finalEndMinutes / 60);
      const endMins = finalEndMinutes % 60;

      return {
        start: `${startHours.toString().padStart(2, "0")}:${startMins
          .toString()
          .padStart(2, "0")}`,
        end: `${endHours.toString().padStart(2, "0")}:${endMins
          .toString()
          .padStart(2, "0")}`,
        startMinutes: finalStartMinutes,
        endMinutes: finalEndMinutes,
        followsBlock,
        blockTimeRange,
        gapToPrevious,
        gapFromBlock,
      };
    },
    [scheduledItems, dayStartTime, blockedTimes]
  );
  const validateNoOverlap = useCallback(
    (newItems) => {
      let startMinutes =
        parseInt(dayStartTime.split(":")[0]) * 60 +
        parseInt(dayStartTime.split(":")[1]);

      const taskTimes = [];
      let currentTime = startMinutes;

      for (const item of newItems) {
        let taskStart = currentTime;
        let taskEnd = taskStart + item.duration;

        for (const block of blockedTimes) {
          const blockStart =
            parseInt(block.start.split(":")[0]) * 60 +
            parseInt(block.start.split(":")[1]);
          const blockEnd =
            parseInt(block.end.split(":")[0]) * 60 +
            parseInt(block.end.split(":")[1]);

          if (
            (taskStart >= blockStart && taskStart <= blockEnd) ||
            (taskEnd >= blockStart && taskEnd <= blockEnd) ||
            (taskStart <= blockStart && taskEnd >= blockEnd)
          ) {
            taskStart = blockEnd + 1;
            taskEnd = taskStart + item.duration;
          }
        }

        taskTimes.push({ start: taskStart, end: taskEnd });
        currentTime = taskEnd + 1;
      }

      for (let i = 1; i < taskTimes.length; i++) {
        if (taskTimes[i].start <= taskTimes[i - 1].end) {
          return false;
        }
      }

      return true;
    },
    [dayStartTime, blockedTimes]
  );
  const handleAddBlockedTime = useCallback(() => {
    if (!newBlockStart || !newBlockEnd) return;

    const startMinutes =
      parseInt(newBlockStart.split(":")[0]) * 60 +
      parseInt(newBlockStart.split(":")[1]);
    const endMinutes =
      parseInt(newBlockEnd.split(":")[0]) * 60 +
      parseInt(newBlockEnd.split(":")[1]);

    if (startMinutes >= endMinutes) {
      setError("End time must be after start time");
      return;
    }

    const newBlock = {
      id: Math.random().toString(36).substr(2, 9),
      start: newBlockStart,
      end: newBlockEnd,
    };

    setBlockedTimes((prev) => [...prev, newBlock]);
    setNewBlockStart("");
    setNewBlockEnd("");

    if (!validateNoOverlap(scheduledItems)) {
      setError("Adding this blocked time conflicts with existing tasks");
      setBlockedTimes((prev) =>
        prev.filter((block) => block.id !== newBlock.id)
      );
    } else {
      setError("");
    }
  }, [newBlockStart, newBlockEnd, validateNoOverlap, scheduledItems]);
  const handleRemoveBlockedTime = useCallback((id) => {
    setBlockedTimes((prev) => prev.filter((block) => block.id !== id));
    setError("");
  }, []);
  const handleStreamResponse = useHandleStreamResponse({
    onChunk: setStreamingMessage,
    onFinish: (message) => {
      try {
        const parsedResponse = JSON.parse(message);
        if (parsedResponse.newOrder) {
          setScheduledItems(parsedResponse.newOrder);
        }
      } catch (e) {
        console.error("Failed to parse response");
      }
      setStreamingMessage("");
    },
  });
  const handleDragStart = (e, index, source) => {
    const originalRect = e.target.getBoundingClientRect();
    const dragPreview = e.target.cloneNode(true);
    dragPreview.style.opacity = "0.5";
    dragPreview.style.position = "absolute";
    dragPreview.style.top = "-1000px";
    dragPreview.style.width = originalRect.width + "px";

    const durationInput = dragPreview.querySelector('input[type="number"]');
    if (durationInput) {
      durationInput.style.width = "64px";
      durationInput.style.maxWidth = "64px";
      durationInput.style.minWidth = "64px";
    }

    document.body.appendChild(dragPreview);
    const offsetX = e.clientX - originalRect.left;
    const offsetY = e.clientY - originalRect.top;
    e.dataTransfer.setDragImage(dragPreview, offsetX, offsetY);
    setTimeout(() => document.body.removeChild(dragPreview), 0);
    setDraggedItem(index);
    setDragSource(source);
  };
  const handleDragEnd = (e) => {
    setDraggedItem(null);
    setDragSource(null);
    setDragOverIndex(null);
  };
  const handleDragOver = useCallback(
    (e, index) => {
      e.preventDefault();
      if (draggedItem === null) return;
      setDragOverIndex(index);
    },
    [draggedItem]
  );
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [notification, setNotification] = useState(null);
  const showNotification = useCallback((text) => {
    setNotification(text);
    setTimeout(() => setNotification(null), 2000);
  }, []);
  const handleDrop = useCallback(
    async (e, dropIndex) => {
      e.preventDefault();
      if (draggedItem === null) return;

      let draggedItemContent;
      let newScheduledItems;
      let newUnscheduledItems;

      if (dragSource === "scheduled") {
        draggedItemContent = scheduledItems[draggedItem];
        newScheduledItems = [...scheduledItems];
        newScheduledItems.splice(draggedItem, 1);
        newScheduledItems.splice(dropIndex, 0, draggedItemContent);
      } else {
        draggedItemContent = {
          ...unscheduledItems[draggedItem],
          roundingEnabled: false,
        };
        newScheduledItems = [...scheduledItems];
        newScheduledItems.splice(dropIndex, 0, draggedItemContent);
        newUnscheduledItems = [...unscheduledItems];
        newUnscheduledItems.splice(draggedItem, 1);
      }

      if (!validateNoOverlap(newScheduledItems)) {
        setError("Tasks must be at least 1 minute apart");
        setDraggedItem(null);
        setDragSource(null);
        setDragOverIndex(null);
        return;
      }

      setError("");
      setDroppedIndex(dropIndex);
      setTimeout(() => setDroppedIndex(null), 200);

      setScheduledItems(newScheduledItems);
      if (dragSource === "unscheduled") {
        setUnscheduledItems(newUnscheduledItems);
      }
      setDragOverIndex(null);
      setDraggedItem(null);
      setDragSource(null);

      const response = await fetch("/integrations/google-gemini-1-5/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Reorder this list: Moving item from position ${draggedItem} to position ${dropIndex}. Current order: ${JSON.stringify(
                scheduledItems
              )}`,
            },
          ],
          json_schema: {
            name: "reorder_list",
            schema: {
              type: "object",
              properties: {
                newOrder: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "number" },
                      name: { type: "string" },
                      duration: { type: "number" },
                      roundingEnabled: { type: "boolean" },
                    },
                    required: ["id", "name", "duration", "roundingEnabled"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["newOrder"],
              additionalProperties: false,
            },
          },
        }),
      });

      handleStreamResponse(response);
    },
    [
      draggedItem,
      dragSource,
      scheduledItems,
      unscheduledItems,
      validateNoOverlap,
    ]
  );
  const handleDropToUnscheduled = useCallback(
    (e) => {
      e.preventDefault();
      if (draggedItem === null || dragSource !== "scheduled") return;

      const draggedItemContent = scheduledItems[draggedItem];
      const newScheduledItems = [...scheduledItems];
      newScheduledItems.splice(draggedItem, 1);

      setScheduledItems(newScheduledItems);
      setUnscheduledItems((prev) => [...prev, draggedItemContent]);
      setDragOverIndex(null);
      setDraggedItem(null);
      setDragSource(null);
    },
    [draggedItem, dragSource, scheduledItems]
  );
  const handleAddItem = useCallback(() => {
    if (!newItemName.trim() || !newItemDuration) return;

    const newItem = {
      id:
        Math.max(
          ...[...scheduledItems, ...unscheduledItems].map((item) => item.id),
          0
        ) + 1,
      name: newItemName.trim(),
      duration: parseInt(newItemDuration),
      roundingEnabled: false,
    };

    setUnscheduledItems((prev) => [...prev, newItem]);
    setNewItemName("");
  }, [scheduledItems, unscheduledItems, newItemName, newItemDuration]);
  const handleUpdateDuration = useCallback(
    (id, newDuration) => {
      const durations = [20, 46, 76, 106, 136, 166, 196, 226];
      let targetDuration = newDuration;

      if (
        typeof newDuration === "string" &&
        (newDuration === "increment" || newDuration === "decrement")
      ) {
        const currentItem = scheduledItems.find((item) => item.id === id);
        const currentDuration = currentItem ? currentItem.duration : 0;

        if (newDuration === "increment") {
          targetDuration =
            durations.find((d) => d > currentDuration) ||
            durations[durations.length - 1];
        } else {
          targetDuration =
            [...durations].reverse().find((d) => d < currentDuration) ||
            durations[0];
        }
      }

      const newItems = scheduledItems.map((item) =>
        item.id === id
          ? { ...item, duration: parseInt(targetDuration) || 0 }
          : item
      );

      if (!validateNoOverlap(newItems)) {
        setError("Tasks must be at least 1 minute apart");
        return;
      }

      setError("");
      setScheduledItems(newItems);
    },
    [scheduledItems, validateNoOverlap]
  );
  const handleUpdateDurationUnscheduled = useCallback(
    (id, newDuration) => {
      const durations = [20, 46, 76, 106, 136, 166, 196, 226];
      let targetDuration = newDuration;

      if (
        typeof newDuration === "string" &&
        (newDuration === "increment" || newDuration === "decrement")
      ) {
        const currentItem = unscheduledItems.find((item) => item.id === id);
        const currentDuration = currentItem ? currentItem.duration : 0;

        if (newDuration === "increment") {
          targetDuration =
            durations.find((d) => d > currentDuration) ||
            durations[durations.length - 1];
        } else {
          targetDuration =
            [...durations].reverse().find((d) => d < currentDuration) ||
            durations[0];
        }
      }

      setUnscheduledItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, duration: parseInt(targetDuration) || 0 }
            : item
        )
      );
    },
    [unscheduledItems]
  );
  const handleRemoveItem = useCallback((id) => {
    // Reset touch-related states
    setSwipingItem(null);
    setTouchStart(null);
    setTouchEnd(null);

    // Restore body scroll and container styles
    document.body.style.position = "";
    document.body.style.width = "";
    document.body.style.top = "";
    document.body.style.touchAction = "";

    // Reset container styles
    const containers = document.querySelectorAll(
      ".scheduled-container, .unscheduled-container"
    );
    containers.forEach((container) => {
      container.style.touchAction = "";
      container.style.overflowY = "auto";
    });

    // Remove the item
    setScheduledItems((prev) => prev.filter((item) => item.id !== id));
    setError("");
  }, []);
  const handleRemoveItemUnscheduled = useCallback((id) => {
    setUnscheduledItems((prev) => prev.filter((item) => item.id !== id));
  }, []);
  const handleRoundToFiveMinutes = useCallback(() => {
    let newScheduledItems = [...scheduledItems];
    let startMinutes =
      parseInt(dayStartTime.split(":")[0]) * 60 +
      parseInt(dayStartTime.split(":")[1]);
    let currentTime = startMinutes;
    for (let i = 0; i < newScheduledItems.length; i++) {
      let taskStart = currentTime;
      if (taskStart % 5 !== 0) {
        taskStart = Math.ceil(taskStart / 5) * 5;
      }
      let taskEnd = taskStart + newScheduledItems[i].duration;
      for (const block of blockedTimes) {
        const blockStart =
          parseInt(block.start.split(":")[0]) * 60 +
          parseInt(block.start.split(":")[1]);
        const blockEnd =
          parseInt(block.end.split(":")[0]) * 60 +
          parseInt(block.end.split(":")[1]);
        if (
          (taskStart >= blockStart && taskStart <= blockEnd) ||
          (taskEnd >= blockStart && taskEnd <= blockEnd) ||
          (taskStart <= blockStart && taskEnd >= blockEnd)
        ) {
          taskStart = blockEnd + 1;
          if (taskStart % 5 !== 0) {
            taskStart = Math.ceil(taskStart / 5) * 5;
          }
          taskEnd = taskStart + newScheduledItems[i].duration;
        }
      }
      currentTime = taskEnd + 1;
    }
    setScheduledItems(newScheduledItems);
    setError("");
  }, [scheduledItems, dayStartTime, blockedTimes]);
  const getBorderColor = (duration) => {
    if (duration <= 45) return "border-l-[#E3F2FD]";
    if (duration <= 75) return "border-l-[#BBDEFB]";
    if (duration <= 105) return "border-l-[#90CAF9]";
    if (duration <= 135) return "border-l-[#64B5F6]";
    if (duration <= 195) return "border-l-[#42A5F5]";
    if (duration <= 225) return "border-l-[#2196F3]";
    return "border-l-[#1976D2]";
  };
  const handleToggleRounding = useCallback((id) => {
    setScheduledItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, roundingEnabled: !item.roundingEnabled }
          : item
      )
    );
  }, []);
  const handleMoveToSchedule = useCallback(
    (id) => {
      const itemToMove = unscheduledItems.find((item) => item.id === id);
      if (!itemToMove) return;

      const newScheduledItems = [
        ...scheduledItems,
        { ...itemToMove, roundingEnabled: false },
      ];

      if (!validateNoOverlap(newScheduledItems)) {
        setError("Tasks must be at least 1 minute apart");
        return;
      }

      setError("");
      setScheduledItems(newScheduledItems);
      setUnscheduledItems((prev) => prev.filter((item) => item.id !== id));
    },
    [unscheduledItems, scheduledItems, validateNoOverlap]
  );
  const handleCopySchedule = useCallback(() => {
    const today = new Date();
    const dateStr = today.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const scheduledData = scheduledItems.map((item, index) => {
      const times = calculateTime(index);
      return {
        name: item.name,
        duration: item.duration,
        timeRange: `${times.start.replace(":", "")}-${times.end.replace(
          ":",
          ""
        )}`,
      };
    });

    const blockedData = blockedTimes.map((block) => ({
      name: "BLOCKED",
      duration:
        parseInt(block.end.split(":")[0]) * 60 +
        parseInt(block.end.split(":")[1]) -
        (parseInt(block.start.split(":")[0]) * 60 +
          parseInt(block.start.split(":")[1])),
      timeRange: `${block.start.replace(":", "")}-${block.end.replace(
        ":",
        ""
      )}`,
    }));

    const allItems = [...scheduledData, ...blockedData].sort((a, b) => {
      const aStart = parseInt(a.timeRange.split("-")[0]);
      const bStart = parseInt(b.timeRange.split("-")[0]);
      return aStart - bStart;
    });

    const tableData = allItems
      .map(
        (item) =>
          `${item.name.padEnd(30)} | ${item.duration.toString().padEnd(8)} | ${
            item.timeRange
          }`
      )
      .join("\n");

    const header = `Schedule for ${dateStr}\n\nName                           | Duration | Time Range\n`;
    const separator = "-".repeat(60) + "\n";
    const fullTable = header + separator + tableData;

    navigator.clipboard.writeText(fullTable);
    showNotification("Schedule copied to clipboard");
  }, [scheduledItems, blockedTimes, calculateTime]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === "ArrowRight" && unscheduledItems.length > 0) {
        const lastItem = unscheduledItems[unscheduledItems.length - 1];
        const newScheduledItems = [
          ...scheduledItems,
          { ...lastItem, roundingEnabled: false },
        ];

        if (!validateNoOverlap(newScheduledItems)) {
          setError("Tasks must be at least 1 minute apart");
          return;
        }

        setError("");
        setScheduledItems(newScheduledItems);
        setUnscheduledItems((prev) => prev.slice(0, -1));
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [unscheduledItems, scheduledItems, validateNoOverlap]);

  const handleTouchStart = (e, index, source) => {
    if (
      source === "unscheduled" &&
      "ontouchstart" in window &&
      window.innerWidth <= 1024
    )
      return;

    // Ignore touch events from buttons and inputs
    if (
      e.target.tagName.toLowerCase() === "button" ||
      e.target.tagName.toLowerCase() === "input" ||
      e.target.closest("button") ||
      e.target.closest("input") ||
      e.target.tagName.toLowerCase() === "i" // For font-awesome icons
    ) {
      return;
    }

    if (e.touches.length > 1) return;
    e.preventDefault();

    const touch = e.targetTouches[0];
    const item = e.currentTarget;
    const rect = item.getBoundingClientRect();
    const containerRect = item.parentElement.getBoundingClientRect();

    const touchStartInfo = {
      y: touch.clientY,
      itemHeight: rect.height,
      containerTop: containerRect.top,
      initialY: touch.clientY - rect.top,
      scrollTop: window.scrollY,
    };

    setTouchStart(touchStartInfo);
    setSwipingItem({ index, source });

    const container = item.closest(
      ".scheduled-container, .unscheduled-container"
    );
    if (container) {
      container.style.touchAction = "none";
      container.style.overflowY = "hidden";

      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      document.body.style.top = `-${touchStartInfo.scrollTop}px`;
    }
  };

  const handleTouchMove = (e) => {
    if (!swipingItem || !touchStart) return;

    e.preventDefault();
    e.stopPropagation();

    const touch = e.targetTouches[0];
    const currentItem = e.currentTarget;
    const deltaY = touch.clientY - touchStart.y;

    const containerClass =
      swipingItem.source === "scheduled"
        ? "scheduled-container"
        : "unscheduled-container";
    const container = currentItem.closest(`.${containerClass}`);
    if (!container) {
      console.error(`Container not found with class ${containerClass}`);
      return;
    }

    const items = Array.from(
      container.querySelectorAll(`[data-item-source="${swipingItem.source}"]`)
    );

    if (items.length === 0) {
      console.error(`No draggable items found in ${containerClass}`);
      return;
    }

    const itemPositions = items
      .map((item) => {
        const rect = item.getBoundingClientRect();
        const index = parseInt(item.getAttribute("data-item-index"));
        if (isNaN(index)) {
          console.error("Invalid index found on item");
          return null;
        }
        const transform = item.style.transform;

        item.style.transform = "";
        const baseRect = item.getBoundingClientRect();
        item.style.transform = transform;

        return {
          index,
          element: item,
          basePosition: baseRect.top + baseRect.height / 2,
          currentPosition: rect.top + rect.height / 2,
          isDragging: item === currentItem,
          height: rect.height,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.basePosition - b.basePosition);

    if (itemPositions.length === 0) {
      console.error("No valid item positions calculated");
      return;
    }

    const draggedItem = itemPositions.find((ip) => ip.isDragging);
    if (!draggedItem) {
      console.error("Dragged item not found in positions");
      return;
    }

    const draggedItemNewCenter = draggedItem.basePosition + deltaY;

    let newIndex = swipingItem.index;
    if (deltaY > 0) {
      for (let i = 0; i < itemPositions.length; i++) {
        if (
          itemPositions[i].index > swipingItem.index &&
          draggedItemNewCenter >
            itemPositions[i].basePosition - draggedItem.height / 2
        ) {
          newIndex = itemPositions[i].index;
        }
      }
    } else {
      for (let i = 0; i < itemPositions.length; i++) {
        if (draggedItemNewCenter < itemPositions[i].basePosition) {
          newIndex = itemPositions[i].index;
          break;
        }
        if (i === itemPositions.length - 1) {
          newIndex = itemPositions[i].index;
        }
      }
    }

    itemPositions.forEach((ip) => {
      const item = ip.element;
      if (ip.isDragging) {
        item.style.transform = `translateY(${deltaY}px)`;
        item.style.zIndex = "1000";
      } else {
        if (deltaY > 0) {
          if (ip.index > swipingItem.index && ip.index <= newIndex) {
            item.style.transform = `translateY(-${draggedItem.height}px)`;
          } else {
            item.style.transform = "";
          }
        } else if (deltaY < 0) {
          if (ip.index >= newIndex && ip.index < swipingItem.index) {
            item.style.transform = `translateY(${draggedItem.height}px)`;
          } else {
            item.style.transform = "";
          }
        }
        item.style.transition = "transform 0.2s";
      }
    });

    setTouchEnd({ y: touch.clientY, newIndex });
  };

  const handleTouchEnd = (e) => {
    if (!swipingItem || !touchStart) return;

    const currentItem = e.currentTarget;
    const containerClass =
      swipingItem.source === "scheduled"
        ? "scheduled-container"
        : "unscheduled-container";
    const container = currentItem.closest(`.${containerClass}`);

    if (container) {
      container.style.touchAction = "";
      container.style.overflowY = "auto";
    }

    // Restore body position and scroll
    const scrollY = touchStart.scrollTop;
    document.body.style.position = "";
    document.body.style.width = "";
    document.body.style.top = "";
    window.scrollTo(0, scrollY);

    const items = Array.from(
      container?.querySelectorAll(
        `[data-item-source="${swipingItem.source}"]`
      ) || []
    );
    items.forEach((item) => {
      item.style.transition = "none";
      item.style.transform = "";
      item.style.zIndex = "";
    });

    // Only attempt to reorder if we actually dragged to a new position
    if (touchEnd && touchEnd.newIndex !== swipingItem.index) {
      if (swipingItem.source === "scheduled") {
        const newItems = [...scheduledItems];
        const [removed] = newItems.splice(swipingItem.index, 1);
        newItems.splice(touchEnd.newIndex, 0, removed);

        if (validateNoOverlap(newItems)) {
          setScheduledItems(newItems);
        }
      } else {
        const newItems = [...unscheduledItems];
        const [removed] = newItems.splice(swipingItem.index, 1);
        newItems.splice(touchEnd.newIndex, 0, removed);
        setUnscheduledItems(newItems);
      }
    }

    // Always clean up the touch states
    setSwipingItem(null);
    setTouchStart(null);
    setTouchEnd(null);

    requestAnimationFrame(() => {
      items.forEach((item) => {
        item.style.transition = "transform 0.2s ease-out";
      });
    });
  };

  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 relative overflow-hidden overscroll-none">
      <link
        rel="icon"
        href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🍞</text></svg>"
      />
      {notification && (
        <div className="fixed bottom-4 left-4 bg-gray-800 border border-gray-700 text-gray-100 px-4 py-2 rounded-md flex items-center gap-2 shadow-md notification-fade z-50">
          <span>{notification}</span>
          <i className="fas fa-check text-green-400"></i>
        </div>
      )}

      <div className="absolute top-4 right-4 text-2xl flex gap-2">🍞</div>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-6xl">
        <div className="w-full sm:w-[calc(50%-25px)] bg-white rounded-lg shadow-md overflow-hidden min-h-[150px] sm:min-h-[600px] flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-gray-800 font-roboto text-lg mb-4">
              Unscheduled tasks
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex-1 min-w-[150px] max-w-[400px]">
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      newItemName.trim() &&
                      newItemDuration
                    ) {
                      handleAddItem();
                    }
                  }}
                  placeholder="New task"
                  className="w-full bg-gray-50 text-gray-800 px-3 py-2 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const currentDuration = parseInt(newItemDuration) || 0;
                    const durations = [20, 46, 76, 106, 136, 166, 196, 226];
                    const newDuration =
                      [...durations]
                        .reverse()
                        .find((d) => d < currentDuration) || durations[0];
                    setNewItemDuration(newDuration.toString());
                  }}
                  className="bg-gray-100 hover:bg-gray-200 w-7 h-8 rounded-md flex items-center justify-center text-blue-500 font-bold shadow-sm"
                >
                  -
                </button>
                <input
                  type="number"
                  value={newItemDuration}
                  onChange={(e) =>
                    setNewItemDuration(
                      Math.max(0, parseInt(e.target.value) || 0).toString()
                    )
                  }
                  placeholder="Duration"
                  className="w-16 bg-gray-50 text-gray-800 px-2 py-1 rounded border border-gray-200 text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={() => {
                    const currentDuration = parseInt(newItemDuration) || 0;
                    const durations = [20, 46, 76, 106, 136, 166, 196, 226];
                    const newDuration =
                      durations.find((d) => d > currentDuration) ||
                      durations[durations.length - 1];
                    setNewItemDuration(newDuration.toString());
                  }}
                  className="bg-gray-100 hover:bg-gray-200 w-7 h-8 rounded-md flex items-center justify-center text-blue-500 font-bold shadow-sm"
                >
                  +
                </button>
                <button
                  onClick={handleAddItem}
                  disabled={!newItemName.trim() || !newItemDuration}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-roboto px-4 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm whitespace-nowrap"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
          <div
            className="flex-1 p-2 min-h-[200px] bg-gray-50 unscheduled-container"
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverIndex(null);
            }}
            onDrop={(e) => handleDropToUnscheduled(e)}
          >
            {unscheduledItems.map((item, index) => (
              <div
                key={item.id}
                draggable={window.innerWidth > 640}
                onDragStart={(e) =>
                  window.innerWidth > 640 &&
                  handleDragStart(e, index, "unscheduled")
                }
                onDragEnd={(e) => window.innerWidth > 640 && handleDragEnd(e)}
                onTouchStart={(e) => handleTouchStart(e, index, "unscheduled")}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                data-item-index={index}
                data-item-source="unscheduled"
                className={`draggable-item bg-white mb-2 last:mb-0 rounded-md shadow-sm hover:shadow-md transition-shadow group border-l-4 ${getBorderColor(
                  item.duration
                )}`}
              >
                <div
                  className={`flex items-center justify-between px-4 py-3 ${
                    swipingItem?.index === index &&
                    swipingItem?.source === "unscheduled"
                      ? "invisible"
                      : ""
                  }`}
                >
                  <div className="flex-1">
                    <div className="text-gray-800 font-roboto">{item.name}</div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateDurationUnscheduled(item.id, "decrement");
                      }}
                      className="bg-gray-100 hover:bg-gray-200 w-7 h-8 rounded-md flex items-center justify-center text-blue-500 font-bold shadow-sm"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={item.duration}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleUpdateDurationUnscheduled(
                          item.id,
                          Math.max(0, parseInt(e.target.value) || 0)
                        );
                      }}
                      className="w-16 bg-gray-50 text-gray-800 px-2 py-1 rounded border border-gray-200 text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateDurationUnscheduled(item.id, "increment");
                      }}
                      className="bg-gray-100 hover:bg-gray-200 w-7 h-8 rounded-md flex items-center justify-center text-blue-500 font-bold shadow-sm"
                    >
                      +
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleMoveToSchedule(item.id);
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleMoveToSchedule(item.id);
                      }}
                      className={`bg-gray-100 hover:bg-gray-200 w-7 h-8 rounded-md flex items-center justify-center ${
                        index === unscheduledItems.length - 1
                          ? "text-blue-500"
                          : "text-gray-400 hover:text-blue-500"
                      } shadow-sm touch-manipulation`}
                    >
                      <i className="fas fa-arrow-right"></i>
                    </button>
                    <button
                      onClick={() => handleRemoveItemUnscheduled(item.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors ml-2"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full sm:w-[calc(50%+25px)] bg-white rounded-lg shadow-md overflow-hidden min-h-[600px] flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-gray-800 font-roboto text-lg">Schedule</h2>
                <button
                  onClick={handleCopySchedule}
                  className="text-blue-500 hover:text-blue-600 transition-colors"
                  title="Copy schedule"
                >
                  <i className="fas fa-copy"></i>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <i className="fas fa-flag-checkered text-blue-500"></i>
                <input
                  type="time"
                  value={dayStartTime}
                  onChange={(e) => setDayStartTime(e.target.value)}
                  className="w-[110px] bg-gray-50 text-gray-800 px-3 py-2 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent [&::-webkit-calendar-picker-indicator]:hidden"
                />
              </div>
            </div>
            <div className="mb-4">
              <h3 className="text-gray-800 font-roboto text-sm mb-2">
                Blocked time ranges
              </h3>
              <div className="flex gap-2 mb-1">
                <input
                  type="time"
                  value={newBlockStart}
                  onChange={(e) => setNewBlockStart(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newBlockStart && newBlockEnd) {
                      handleAddBlockedTime();
                    }
                  }}
                  className="flex-1 bg-gray-50 text-gray-800 px-3 py-2 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent [&::-webkit-calendar-picker-indicator]:hidden"
                />
                <input
                  type="time"
                  value={newBlockEnd}
                  onChange={(e) => setNewBlockEnd(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newBlockStart && newBlockEnd) {
                      handleAddBlockedTime();
                    }
                  }}
                  className="flex-1 bg-gray-50 text-gray-800 px-3 py-2 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent [&::-webkit-calendar-picker-indicator]:hidden"
                />
                <button
                  onClick={handleAddBlockedTime}
                  disabled={!newBlockStart || !newBlockEnd}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <i className="fas fa-plus"></i>
                </button>
              </div>
              <div className="flex flex-wrap gap-0.5 text-xs text-gray-400">
                {blockedTimes.map((block, index) => (
                  <span
                    key={block.id}
                    className="inline-flex items-center group px-1 py-0.5 rounded"
                  >
                    <span className="font-light whitespace-nowrap">
                      {block.start} - {block.end}
                    </span>
                    <button
                      onClick={() => handleRemoveBlockedTime(block.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all ml-1"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </span>
                ))}
              </div>
            </div>
            {error && <div className="mb-4 text-red-500 text-sm">{error}</div>}
          </div>
          <div
            className="flex-1 min-h-[400px] bg-gray-50 pb-2 p-2 overflow-y-auto touch-pan-y scheduled-container"
            onDragOver={(e) => {
              e.preventDefault();
              if (scheduledItems.length === 0) {
                setDragOverIndex(0);
              }
            }}
            onDrop={(e) => {
              if (scheduledItems.length === 0 && dragSource === "unscheduled") {
                handleDrop(e, 0);
              }
            }}
          >
            {scheduledItems.map((item, index) => {
              const times = calculateTime(index);
              return (
                <div key={item.id} className="flex items-start w-full">
                  <div className="w-[40px] flex flex-col items-end mr-2">
                    {times.gapToPrevious > 1 && (
                      <div className="px-2 text-gray-500 text-xs font-roboto mt-2">
                        {times.gapToPrevious}m
                      </div>
                    )}
                    {times.followsBlock && times.gapFromBlock > 1 && (
                      <div className="px-2 text-gray-500 text-xs font-roboto mt-[68px]">
                        {times.gapFromBlock}m
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    {times.followsBlock && times.blockTimeRange && (
                      <div
                        className={`mt-2 px-4 py-3 bg-red-50 border-l-4 border-red-500 rounded-r-md flex justify-between items-center ${
                          draggedItem !== null ? "sliding-animation" : ""
                        }`}
                        style={{
                          transform:
                            draggedItem !== null && dragOverIndex !== null
                              ? index > draggedItem && index <= dragOverIndex
                                ? "translateY(calc(-100% - 0.5rem))"
                                : index < draggedItem && index >= dragOverIndex
                                ? "translateY(calc(100% + 0.5rem))"
                                : "translateY(0)"
                              : "translateY(0)",
                        }}
                      >
                        <div>
                          <div className="text-red-600 font-roboto">
                            Blocked Time
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 text-sm">
                            <span className="time-range">
                              <span>{times.blockTimeRange.start}</span>
                              <span className="time-range-separator"> - </span>
                              <span>{times.blockTimeRange.end}</span>
                            </span>
                            <button
                              onClick={() => {
                                const timeRange = `${times.blockTimeRange.start.replace(
                                  ":",
                                  ""
                                )}-${times.blockTimeRange.end.replace(
                                  ":",
                                  ""
                                )}`;
                                navigator.clipboard.writeText(timeRange);
                                showNotification(
                                  `${timeRange} copied to clipboard`
                                );
                              }}
                              className="text-red-500 hover:text-red-600"
                              title="Copy time range"
                            >
                              <i className="fas fa-copy"></i>
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            handleRemoveBlockedTime(times.blockTimeRange.id)
                          }
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    )}
                    <div
                      draggable={window.innerWidth > 640}
                      onDragStart={(e) =>
                        window.innerWidth > 640 &&
                        handleDragStart(e, index, "scheduled")
                      }
                      onDragEnd={(e) =>
                        window.innerWidth > 640 && handleDragEnd(e)
                      }
                      onDragOver={(e) =>
                        window.innerWidth > 640 && handleDragOver(e, index)
                      }
                      onDrop={(e) =>
                        window.innerWidth > 640 && handleDrop(e, index)
                      }
                      onTouchStart={(e) =>
                        handleTouchStart(e, index, "scheduled")
                      }
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      data-item-index={index}
                      data-item-source="scheduled"
                      className={`draggable-item mt-2 bg-white rounded-md shadow-sm hover:shadow-md transition-all group border-l-4 ${getBorderColor(
                        item.duration
                      )} ${
                        window.innerWidth > 640
                          ? "cursor-grab active:cursor-grabbing"
                          : ""
                      }`}
                      style={{
                        transform:
                          swipingItem?.index === index &&
                          swipingItem?.source === "scheduled" &&
                          touchEnd
                            ? `translateY(${touchEnd - touchStart}px)`
                            : undefined,
                        transition:
                          swipingItem?.index === index
                            ? "none"
                            : "transform 0.2s ease-out",
                        zIndex: swipingItem?.index === index ? "1000" : "1",
                        visibility: "visible",
                        backgroundColor: "white",
                      }}
                    >
                      <div
                        className={`flex items-center justify-between px-4 py-3 ${
                          draggedItem === index ? "invisible" : ""
                        } ${draggedItem !== null ? "sliding-animation" : ""} ${
                          droppedIndex === index ? "drop-animation" : ""
                        }`}
                        style={{
                          transform:
                            draggedItem !== null && dragOverIndex !== null
                              ? index === draggedItem
                                ? "scale(0.95)"
                                : index > draggedItem && index <= dragOverIndex
                                ? "translateY(calc(-100% - 0.5rem))"
                                : index < draggedItem && index >= dragOverIndex
                                ? "translateY(calc(100% + 0.5rem))"
                                : "translateY(0)"
                              : "translateY(0)",
                        }}
                      >
                        <div className="flex-1">
                          <div className="text-gray-800 font-roboto">
                            {item.name}
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 text-sm">
                            <span className="time-range">
                              <span>{times.start}</span>
                              <span className="time-range-separator"> - </span>
                              <span>{times.end}</span>
                            </span>
                            <button
                              onClick={() => {
                                const timeRange = `${times.start.replace(
                                  ":",
                                  ""
                                )}-${times.end.replace(":", "")}`;
                                navigator.clipboard.writeText(timeRange);
                                showNotification(
                                  `${timeRange} copied to clipboard`
                                );
                              }}
                              className="text-blue-500 hover:text-blue-600"
                              title="Copy time range"
                            >
                              <i className="fas fa-copy"></i>
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 ml-2 sm:ml-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateDuration(item.id, "decrement");
                            }}
                            className="bg-gray-100 hover:bg-gray-200 w-6 sm:w-7 h-8 rounded-md flex items-center justify-center text-blue-500 font-bold shadow-sm"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={item.duration}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleUpdateDuration(
                                item.id,
                                Math.max(0, parseInt(e.target.value) || 0)
                              );
                            }}
                            className="w-12 sm:w-16 bg-gray-50 text-gray-800 px-1 sm:px-2 py-1 rounded border border-gray-200 text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateDuration(item.id, "increment");
                            }}
                            className="bg-gray-100 hover:bg-gray-200 w-6 sm:w-7 h-8 rounded-md flex items-center justify-center text-blue-500 font-bold shadow-sm"
                          >
                            +
                          </button>
                          <button
                            onClick={() => handleToggleRounding(item.id)}
                            className={`w-6 sm:w-7 h-8 rounded-md flex items-center justify-center shadow-sm ${
                              item.roundingEnabled
                                ? "bg-blue-500 text-white hover:bg-blue-600"
                                : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                            }`}
                            title={
                              item.roundingEnabled
                                ? "Disable rounding"
                                : "Enable rounding"
                            }
                          >
                            <i className="fas fa-clock-rotate-left fa-flip-horizontal"></i>
                          </button>
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors ml-1 sm:ml-2"
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <style jsx global>{`
        html, body {
          overscroll-behavior-y: none;
        }
        
        .scheduled-container,
        .unscheduled-container {
          overscroll-behavior-y: none;
          -webkit-overflow-scrolling: touch;
        }
        
        .sliding-animation {
          transition: transform 0.2s ease-out;
        }
        .drop-animation {
          animation: subtle-bounce 0.2s ease-in-out;
        }
        @keyframes subtle-bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.01); }
        }
        .notification-fade {
          animation: fadeInOut 2s ease-in-out;
          opacity: 0;
          bottom: max(1rem, env(safe-area-inset-bottom));
        }
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(20px); }
          10% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(20px); }
        }
        .time-range {
          display: inline-flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0;
        }
        .time-range-separator {
          display: inline-block;
          white-space: pre;
          margin: 0;
        }
        @media (max-width: 640px) {
          .time-range {
            flex-wrap: wrap;
          }
          .time-range span:first-child,
          .time-range-separator {
            white-space: nowrap;
            display: inline-block;
          }
          .time-range span:first-child {
            margin-right: 0;
          }
          .time-range span:last-child {
            flex-basis: 100%;
            margin-left: 0;
          }
          .swipe-item {
            touch-action: none;
            user-select: none;
            -webkit-user-select: none;
            -webkit-touch-callout: none;
            -webkit-tap-highlight-color: transparent;
            will-change: transform;
            transform: translateZ(0);
            transition: all 0.2s ease-out;
            background: white;
          }
          
          .swipe-item.swiping {
            background: white;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
                      0 2px 4px -1px rgba(0, 0, 0, 0.06);
          }
          
          .drag-placeholder {
            background: rgba(0, 0, 0, 0.05);
            border-radius: 0.375rem;
            pointer-events: none;
            margin: 8px 0;
          }
        }
      `}</style>
    </div>
  );
}

export default MainComponent;