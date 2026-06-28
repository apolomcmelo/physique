import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({
    name,
    color,
    size,
}: {
    name: IoniconName;
    color: string;
    size: number;
}) {
    return <Ionicons name={name} size={size} color={color} />;
}

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#13131A',
                    borderTopColor: '#2A2A3A',
                    borderTopWidth: 1,
                },
                tabBarActiveTintColor: '#6C63FF',
                tabBarInactiveTintColor: '#505060',
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ color, size }) => (
                        <TabIcon name="home-outline" color={color} size={size} />
                    ),
                }}
            />
            <Tabs.Screen
                name="plan"
                options={{
                    title: 'Plano',
                    tabBarIcon: ({ color, size }) => (
                        <TabIcon name="calendar-outline" color={color} size={size} />
                    ),
                }}
            />
            <Tabs.Screen
                name="workout"
                options={{
                    title: 'Treinos',
                    tabBarIcon: ({ color, size }) => (
                        <TabIcon name="barbell-outline" color={color} size={size} />
                    ),
                }}
            />
            <Tabs.Screen
                name="history"
                options={{
                    title: 'Histórico',
                    tabBarIcon: ({ color, size }) => (
                        <TabIcon name="time-outline" color={color} size={size} />
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Perfil',
                    tabBarIcon: ({ color, size }) => (
                        <TabIcon name="settings-outline" color={color} size={size} />
                    ),
                }}
            />
        </Tabs>
    );
}
