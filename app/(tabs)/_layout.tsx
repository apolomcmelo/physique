import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { APP_TABS } from './tabConfig';

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
            {APP_TABS.map((tab) => (
                <Tabs.Screen
                    key={tab.name}
                    name={tab.name}
                    options={{
                        title: tab.title,
                        tabBarIcon: ({ color, size }) => (
                            <TabIcon name={tab.icon as IoniconName} color={color} size={size} />
                        ),
                    }}
                />
            ))}
        </Tabs>
    );
}
